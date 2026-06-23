import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import evaluationRoutes from './routes/evaluations';
import reportRoutes from './routes/reports';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow the frontend origins (Vercel, localhost, etc.)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://bodytrack-ph0z.onrender.com',
  'https://body-track-web.vercel.app',
  'https://bodytrack-web.vercel.app',
  'http://localhost:10000',
  'http://localhost:5173',
];

const corsOptions = {
  origin: (origin: string | undefined, callback: cors.WithOriginCallback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'BodyTrack API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/reports', reportRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`BodyTrack API rodando em http://localhost:${PORT}`);
});
