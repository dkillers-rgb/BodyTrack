import { Router, Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { fetchTcyReportByKey } from '../services/tcyReportService';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const key = typeof req.query.key === 'string' ? req.query.key.trim() : '';
  if (!key) {
    return res.status(400).json({ error: 'Parâmetro "key" é obrigatório' });
  }

  const report = await fetchTcyReportByKey(key);
  res.json(report);
}));

export default router;
