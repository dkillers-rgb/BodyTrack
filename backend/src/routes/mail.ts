import { Router, Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { sendTemporaryPasswordEmail } from '../services/emailService';

const router = Router();

const recentSends = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;

router.post(
  '/send-temp-password',
  asyncHandler(async (req: Request, res: Response) => {
    const mailKey = process.env.MAIL_API_KEY?.trim();
    if (mailKey) {
      const provided = String(req.header('X-BodyTrack-Mail-Key') || '');
      if (provided !== mailKey) {
        return res.status(401).json({ error: 'Não autorizado a enviar e-mail.' });
      }
    }

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const temporaryPassword =
      typeof req.body?.temporaryPassword === 'string' ? req.body.temporaryPassword.trim() : '';
    const recipientName =
      typeof req.body?.recipientName === 'string' ? req.body.recipientName.trim() : undefined;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }
    if (!temporaryPassword || temporaryPassword.length < 6) {
      return res.status(400).json({ error: 'Senha temporária inválida.' });
    }

    const last = recentSends.get(email) || 0;
    if (Date.now() - last < RATE_LIMIT_MS) {
      return res.status(429).json({
        error: 'Aguarde cerca de 1 minuto antes de pedir outro e-mail.',
      });
    }

    try {
      await sendTemporaryPasswordEmail({
        to: email,
        temporaryPassword,
        recipientName,
      });
      recentSends.set(email, Date.now());
      return res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar e-mail.';
      console.error('send-temp-password error:', message);
      return res.status(503).json({ error: message });
    }
  })
);

export default router;
