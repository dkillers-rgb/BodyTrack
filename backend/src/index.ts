import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import evaluationRoutes from './routes/evaluations';
import reportRoutes from './routes/reports';

const envPathLocal = path.resolve(__dirname, '../.env.local');
const envPathDefault = path.resolve(__dirname, '../.env');
const envPath = fs.existsSync(envPathLocal) ? envPathLocal : envPathDefault;

dotenv.config({ path: envPath });

process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'bodytrack-local-secret';

const app = express();
const PORT = process.env.PORT || 3001;

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

app.listen(PORT, () => {
  console.log(`BodyTrack API rodando em http://localhost:${PORT}`);
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  AVISO: DATABASE_URL não está definido');
  }
});
