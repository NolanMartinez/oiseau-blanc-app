import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import subscriberPublicRoutes from './routes/subscriber.public.routes';
import subscriberAdminRoutes from './routes/subscriber.admin.routes';
import reviewPublicRoutes from './routes/review.public.routes';
import reviewAdminRoutes from './routes/review.admin.routes';
import surveyPublicRoutes from './routes/survey.public.routes';
import surveyAdminRoutes from './routes/survey.admin.routes';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/admin/auth', authRoutes);
app.use('/api/v1/admin/admins', adminRoutes);
app.use('/api/v1/public', subscriberPublicRoutes);
app.use('/api/v1/public', reviewPublicRoutes);
app.use('/api/v1/admin/subscribers', subscriberAdminRoutes);
app.use('/api/v1/admin/reviews', reviewAdminRoutes);
app.use('/api/v1/public', surveyPublicRoutes);
app.use('/api/v1/admin/surveys', surveyAdminRoutes);

app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
});

export default app;
