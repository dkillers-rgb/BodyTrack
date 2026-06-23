import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { parseClientId } from '../lib/parseId';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();
router.use(authMiddleware);

const clientSchema = z.object({
  name: z.string().min(2),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  age: z.number().int().min(1).max(150),
  height: z.number().positive(),
});

router.get('/', asyncHandler(async (req: Request, res: Response) => {
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
  res.json(clients);
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
  res.json(client);
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const client = await prisma.client.create({
    data: { ...parsed.data, userId: req.user!.userId },
  });
  res.status(201).json(client);
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const id = parseClientId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  const existing = await prisma.client.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  const client = await prisma.client.update({
    where: { id },
    data: parsed.data,
  });
  res.json(client);
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
