import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const DEFAULT_USER: AuthPayload = {
  userId: 'public-user-id',
  email: 'public@bodytrack.local',
  role: 'USER',
};

export function signToken(payload: AuthPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado');

  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  req.user = DEFAULT_USER;
  next();
}
