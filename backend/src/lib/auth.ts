import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma';

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

let defaultUser: AuthPayload | null = null;

async function createOrGetDefaultUser(): Promise<AuthPayload> {
  if (defaultUser) return defaultUser;

  const user = await prisma.user.upsert({
    where: { email: 'public@bodytrack.local' },
    update: {},
    create: {
      name: 'Public User',
      email: 'public@bodytrack.local',
      password: 'public',
      role: 'USER',
    },
  });

  defaultUser = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return defaultUser;
}

export function signToken(payload: AuthPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado');

  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Configuração inválida' });

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    req.user = await createOrGetDefaultUser();
    return next();
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    req.user = await createOrGetDefaultUser();
    next();
  }
}
