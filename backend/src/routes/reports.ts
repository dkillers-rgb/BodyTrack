import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { generateEvolutionAnalysis, generateLocalAnalysis } from '../services/aiService';
import { parseClientId } from '../lib/parseId';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();
router.use(authMiddleware);

router.get('/client/:clientId', asyncHandler(async (req: Request, res: Response) => {
  const clientId = parseClientId(req.params.clientId);
  if (!clientId) return res.status(400).json({ error: 'ID inválido' });

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: req.user!.userId },
    include: {
      evaluations: { orderBy: { examDate: 'asc' } },
    },
  });

  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const chartData = client.evaluations.map((e: any) => ({
    date: e.examDate.toISOString().split('T')[0],
    weight: e.weight,
    skeletalMuscle: e.skeletalMuscle,
    bodyFat: e.bodyFat,
  }));

  const latest = client.evaluations[client.evaluations.length - 1];
  let analysis = latest?.aiAnalysis || generateLocalAnalysis(client.evaluations);

  const openAiAnalysis = await generateEvolutionAnalysis(client.name, client.evaluations);
  if (openAiAnalysis) analysis = openAiAnalysis;

  res.json({
    client: {
      id: client.id,
      name: client.name,
      gender: client.gender,
      age: client.age,
      height: client.height,
    },
    evaluations: client.evaluations,
    chartData,
    analysis,
    summary: {
      totalEvaluations: client.evaluations.length,
      latestWeight: latest?.weight,
      latestMuscle: latest?.skeletalMuscle,
      latestFat: latest?.bodyFat,
      firstExam: client.evaluations[0]?.examDate,
      lastExam: latest?.examDate,
    },
  });
}));

router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  try {
    const [totalClients, totalEvaluations, recentEvaluations] = await Promise.all([
      prisma.client.count({ where: { userId: req.user!.userId } }),
      prisma.evaluation.count({ where: { client: { userId: req.user!.userId } } }),
      prisma.evaluation.findMany({
        where: { client: { userId: req.user!.userId } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { examDate: 'desc' },
        take: 10,
      }),
    ]);

    res.json({ totalClients, totalEvaluations, recentEvaluations });
  } catch (error: any) {
    if (error?.message?.includes('Error validating datasource')) {
      return res.status(503).json({ error: 'Banco de dados não configurado' });
    }
    throw error;
  }
}));

export default router;
