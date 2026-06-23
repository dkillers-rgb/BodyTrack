import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { processReportOcr, downloadImageFromUrl } from '../services/ocrService';
import { generateEvolutionAnalysis, generateLocalAnalysis } from '../services/aiService';
import { parseClientId } from '../lib/parseId';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();
router.use(authMiddleware);

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${path.extname(file.originalname) || '.jpg'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');
    if (isImage || isPdf) cb(null, true);
    else cb(new Error('Apenas imagens e PDF são permitidos'));
  },
});

const evaluationSchema = z.object({
  clientId: z.number().int().positive(),
  examDate: z.string().optional(),
  weight: z.number().positive(),
  skeletalMuscle: z.number().nonnegative(),
  bodyFat: z.number().nonnegative(),
});

function formatValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join('. ') || 'Dados inválidos';
}

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const evaluations = await prisma.evaluation.findMany({
    where: { client: { userId: req.user!.userId } },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { examDate: 'desc' },
    take: 50,
  });
  res.json(evaluations);
}));

router.get('/client/:clientId', asyncHandler(async (req: Request, res: Response) => {
  const clientId = parseClientId(req.params.clientId);
  if (!clientId) return res.status(400).json({ error: 'ID inválido' });

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: req.user!.userId },
  });
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const evaluations = await prisma.evaluation.findMany({
    where: { clientId },
    orderBy: { examDate: 'asc' },
  });
  res.json(evaluations);
}));

router.post('/scan-qr', asyncHandler(async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL do relatório é obrigatória' });
  }

  const imageBuffer = await downloadImageFromUrl(url);
  const ocrResult = await processReportOcr(imageBuffer);

  const filename = `${Date.now()}-qr.jpg`;
  const imagePath = path.join(uploadDir, filename);
  fs.writeFileSync(imagePath, imageBuffer);

  res.json({
    imagePath: filename,
    ocr: ocrResult,
    preview: {
      patient: ocrResult.patient,
      muscleFat: ocrResult.muscleFat,
    },
  });
}));

router.post('/process-image', upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Imagem é obrigatória' });
  }

  const fileBuffer = fs.readFileSync(req.file.path);
  const ocrResult = await processReportOcr(fileBuffer, req.file.mimetype);

  res.json({
    imagePath: req.file.filename,
    ocr: ocrResult,
    preview: {
      patient: ocrResult.patient,
      muscleFat: ocrResult.muscleFat,
    },
  });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const parsed = evaluationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatValidationError(parsed.error) });
  }

  try {
    const { clientId, examDate, weight, skeletalMuscle, bodyFat } = parsed.data;
    const imagePath = req.body.imagePath as string | undefined;
    const rawOcrText = req.body.rawOcrText as string | undefined;

    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: req.user!.userId },
    });
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    const evaluation = await prisma.evaluation.create({
      data: {
        clientId,
        examDate: examDate ? new Date(examDate) : new Date(),
        weight,
        skeletalMuscle,
        bodyFat,
        imagePath,
        rawOcrText,
      },
    });

    const allEvaluations = await prisma.evaluation.findMany({
      where: { clientId },
      orderBy: { examDate: 'asc' },
    });

    let aiAnalysis = generateLocalAnalysis(allEvaluations);
    const openAiAnalysis = await generateEvolutionAnalysis(client.name, allEvaluations);
    if (openAiAnalysis) aiAnalysis = openAiAnalysis;

    const updated = await prisma.evaluation.update({
      where: { id: evaluation.id },
      data: { aiAnalysis },
    });

    res.status(201).json(updated);
  } catch (error: any) {
    if (error?.message?.includes('Error validating datasource')) {
      return res.status(503).json({ error: 'Banco de dados não configurado' });
    }
    throw error;
  }
}));

router.post('/auto-save', upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  let imageBuffer: Buffer;
  let imagePath: string | undefined;

  if (req.file) {
    imageBuffer = fs.readFileSync(req.file.path);
    imagePath = req.file.filename;
  } else if (req.body.url) {
    imageBuffer = await downloadImageFromUrl(req.body.url);
    const filename = `${Date.now()}-auto.jpg`;
    imagePath = filename;
    fs.writeFileSync(path.join(uploadDir, filename), imageBuffer);
  } else {
    return res.status(400).json({ error: 'Envie uma imagem, PDF ou URL' });
  }

  const ocrResult = await processReportOcr(
    imageBuffer,
    req.file?.mimetype
  );
  const { patient, muscleFat } = ocrResult;

  if (!muscleFat.weight) {
    return res.status(422).json({
      error: 'Não foi possível extrair os dados de composição corporal. Revise manualmente.',
      ocr: ocrResult,
      imagePath,
    });
  }

  const clientId = parseClientId(req.body.clientId);
  if (!clientId) {
    return res.status(400).json({ error: 'Selecione um cliente cadastrado' });
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: req.user!.userId },
  });
  if (!client) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      clientId: client.id,
      examDate: patient.examDate || new Date(),
      weight: muscleFat.weight,
      skeletalMuscle: muscleFat.skeletalMuscle || 0,
      bodyFat: muscleFat.bodyFat || 0,
      imagePath,
      rawOcrText: ocrResult.rawText,
    },
  });

  const allEvaluations = await prisma.evaluation.findMany({
    where: { clientId: client.id },
    orderBy: { examDate: 'asc' },
  });

  let aiAnalysis = generateLocalAnalysis(allEvaluations);
  const openAiAnalysis = await generateEvolutionAnalysis(client.name, allEvaluations);
  if (openAiAnalysis) aiAnalysis = openAiAnalysis;

  const updated = await prisma.evaluation.update({
    where: { id: evaluation.id },
    data: { aiAnalysis },
    include: { client: true },
  });

  res.status(201).json(updated);
}));

export default router;
