import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/admin/auth', authRoutes);
app.use('/api/v1/admin/admins', adminRoutes);

app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
});

export default app;
