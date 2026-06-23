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

const DEFAULT_USER_EMAIL = 'public@bodytrack.local';
let cachedDefaultUser: AuthPayload | null = null;

async function createOrGetDefaultUser(): Promise<AuthPayload> {
  if (cachedDefaultUser) return cachedDefaultUser;

  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {},
    create: {
      name: 'Public User',
      email: DEFAULT_USER_EMAIL,
      password: 'public',
      role: 'USER',
    },
  });

  cachedDefaultUser = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return cachedDefaultUser;
}

export function signToken(payload: AuthPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado');

  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    try {
      req.user = await createOrGetDefaultUser();
      return next();
    } catch (error) {
      console.error('Erro ao criar usuário padrão:', error);
      return res.status(500).json({ error: 'Erro interno de autenticação' });
    }
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Configuração inválida' });

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    try {
      req.user = await createOrGetDefaultUser();
      next();
    } catch (error) {
      console.error('Erro ao criar usuário padrão:', error);
      return res.status(500).json({ error: 'Erro interno de autenticação' });
    }
  }
}
