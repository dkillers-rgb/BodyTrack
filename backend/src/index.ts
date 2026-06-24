import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import evaluationRoutes from './routes/evaluations';
import reportRoutes from './routes/reports';

// Check desktop mode BEFORE loading dotenv, so we can decide which .env to use
const isDesktopMode = process.env.BODYTRACK_DESKTOP === '1' || process.env.ELECTRON_RUN_AS_NODE === '1';

const envPathLocal = path.resolve(__dirname, '../.env.local');
const envPathDefault = path.resolve(__dirname, '../.env');
const envPath = fs.existsSync(envPathLocal) ? envPathLocal : envPathDefault;

console.log('ENV PATH DEBUG:', {
  __dirname,
  envPathLocal,
  envPathDefault,
  envPathExists: {
    local: fs.existsSync(envPathLocal),
    default: fs.existsSync(envPathDefault),
  },
  selectedPath: envPath,
  envLocalContent: fs.existsSync(envPathLocal) ? fs.readFileSync(envPathLocal, 'utf-8').split('\n').slice(0, 2) : 'NOT FOUND',
});

const dotenvResult = dotenv.config({ path: envPath });
const envParsed = dotenvResult.parsed || dotenv.parse(fs.readFileSync(envPath, 'utf-8'));
for (const [key, value] of Object.entries(envParsed)) {
  process.env[key] = String(value);
}
console.log('dotenv result:', {
  error: dotenvResult.error ? String(dotenvResult.error).slice(0, 120) : null,
  parsed: envParsed,
});
console.log('AFTER manual override - process.env.DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 60));

// Override DATABASE_URL for desktop/local mode AFTER dotenv loads
const defaultDbPath = path.resolve(__dirname, '..', 'dev.db');
if (isDesktopMode) {
  process.env.DATABASE_URL = `file:${defaultDbPath}`;
}
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'bodytrack-local-secret';
process.env.DISABLE_AUTH = process.env.DISABLE_AUTH || (isDesktopMode ? 'true' : process.env.DISABLE_AUTH);

console.log('Loaded backend env:', {
  DATABASE_URL: process.env.DATABASE_URL,
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  PORT: process.env.PORT,
  ELECTRON_RUN_AS_NODE: process.env.ELECTRON_RUN_AS_NODE,
  BODYTRACK_BACKEND: process.env.BODYTRACK_BACKEND,
  BODYTRACK_DESKTOP: process.env.BODYTRACK_DESKTOP,
  DISABLE_AUTH: process.env.DISABLE_AUTH,
  argv: process.argv,
});

// Apply migrations on startup
async function applyMigrations() {
  try {
    console.log('Applying Prisma migrations...');
    const backendDir = path.resolve(__dirname, '..');
    execSync('npx prisma migrate deploy', {
      cwd: backendDir,
      stdio: 'pipe',
      env: { ...process.env },
    });
    console.log('✅ Migrations applied successfully');
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    // Ignore errors if migrations are already applied
    if (!errorMsg.includes('already exist') && !errorMsg.includes('No pending migrations')) {
      console.warn('⚠️  Migration warning:', errorMsg.substring(0, 200));
    }
  }
}

const app = express();
const PORT = Number(process.env.PORT || 3001);

const corsOptions: cors.CorsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'BodyTrack API' });
});

// Middleware para detectar erros de Prisma relacionados a DATABASE_URL
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.message?.includes('Error validating datasource')) {
    console.error('Aviso: DATABASE_URL não configurado ou inválido');
    return res.status(503).json({
      error: 'Serviço temporariamente indisponível',
      message: 'DATABASE_URL não está configurado corretamente',
    });
  }
  next(err);
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/reports', reportRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const errorMsg = err?.message || '';
  
  // Check if it's a Prisma initialization error or validation error
  if (errorMsg.includes('Error validating datasource') || errorMsg.includes('DATABASE_URL')) {
    console.error('❌ DATABASE_URL não configurado:', errorMsg.substring(0, 100));
    return res.status(503).json({
      error: 'Serviço temporariamente indisponível',
      message: 'DATABASE_URL não está configurado corretamente no ambiente',
    });
  }
  
  console.error('Express error handler caught:', err);
  if (res.headersSent) {
    return _next(err);
  }
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

applyMigrations().then(() => {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`BodyTrack API rodando em http://127.0.0.1:${PORT}`);
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  AVISO: DATABASE_URL não está definido');
    }
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
