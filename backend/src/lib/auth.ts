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

async function ensureDefaultUser() {
  const email = DEFAULT_USER.email;
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: DEFAULT_USER.userId,
      name: 'Public User',
      email,
      password: 'change-me',
      role: 'USER',
    },
  });

  return { userId: user.id, email: user.email, role: user.role };
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    req.user = await ensureDefaultUser();
    return next();
  } catch (err) {
    console.error('authMiddleware error:', err);
    return next(err as any);
  }
}
