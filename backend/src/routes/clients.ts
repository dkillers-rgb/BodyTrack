import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { parseClientId } from '../lib/parseId';
import { asyncHandler } from '../lib/asyncHandler';
import { assertExternalIdUnique, normalizeExternalId } from '../lib/clientExternalId';

const router = Router();
router.use(authMiddleware);

const clientSchema = z.object({
  externalId: z.string().min(1, 'Informe o ID do cliente.'),
  name: z.string().min(2),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  age: z.number().int().min(1).max(150),
  height: z.number().positive(),
  phone: z.string().optional(),
});

function mapClient(client: {
  id: number;
  externalId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: client.id,
    externalId: client.externalId?.trim() || String(client.id),
    name: client.name,
    gender: client.gender,
    age: client.age,
    height: client.height,
    phone: client.phone?.trim() || undefined,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.user!.userId },
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { evaluations: true } },
        evaluations: {
          orderBy: { examDate: 'desc' },
          take: 1,
        },
      },
    });
    res.json(
      clients.map((client) => ({
        ...mapClient(client),
        _count: client._count,
        evaluations: client.evaluations,
      }))
    );
  } catch (error: any) {
    if (error?.message?.includes('Error validating datasource')) {
      return res.status(503).json({ error: 'Banco de dados não configurado' });
    }
    throw error;
  }
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseClientId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  const client = await prisma.client.findFirst({
    where: { id, userId: req.user!.userId },
    include: {
      evaluations: { orderBy: { examDate: 'asc' } },
    },
  });
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({
    ...mapClient(client),
    evaluations: client.evaluations,
  });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('. ');
    return res.status(400).json({ error: message || 'Dados inválidos' });
  }

  try {
    const externalId = normalizeExternalId(parsed.data.externalId);
    await assertExternalIdUnique(req.user!.userId, externalId);

    const phone = parsed.data.phone?.trim() || null;
    const client = await prisma.client.create({
      data: {
        externalId,
        name: parsed.data.name.trim(),
        gender: parsed.data.gender,
        age: parsed.data.age,
        height: parsed.data.height,
        phone,
        userId: req.user!.userId,
      },
    });
    res.status(201).json(mapClient(client));
  } catch (error: any) {
    if (error?.message?.includes('Error validating datasource')) {
      return res.status(503).json({ error: 'Banco de dados não configurado' });
    }
    if (error?.message === 'Já existe um cliente com este ID.' || error?.message === 'Informe o ID do cliente.') {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('. ');
    return res.status(400).json({ error: message || 'Dados inválidos' });
  }

  const id = parseClientId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  const existing = await prisma.client.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  try {
    const externalId = normalizeExternalId(parsed.data.externalId);
    await assertExternalIdUnique(req.user!.userId, externalId, id);

    const client = await prisma.client.update({
      where: { id },
      data: {
        externalId,
        name: parsed.data.name.trim(),
        gender: parsed.data.gender,
        age: parsed.data.age,
        height: parsed.data.height,
        phone: parsed.data.phone?.trim() || null,
      },
    });
    res.json(mapClient(client));
  } catch (error: any) {
    if (error?.message === 'Já existe um cliente com este ID.' || error?.message === 'Informe o ID do cliente.') {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseClientId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  const existing = await prisma.client.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  await prisma.client.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
