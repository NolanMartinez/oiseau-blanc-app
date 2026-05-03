import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import { initVapid } from './services/push.service';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import subscriberPublicRoutes from './routes/subscriber.public.routes';
import subscriberAdminRoutes from './routes/subscriber.admin.routes';
import reviewPublicRoutes from './routes/review.public.routes';
import reviewAdminRoutes from './routes/review.admin.routes';
import surveyPublicRoutes from './routes/survey.public.routes';
import surveyAdminRoutes from './routes/survey.admin.routes';
import votePublicRoutes from './routes/vote.public.routes';
import voteAdminRoutes from './routes/vote.admin.routes';
import dashboardRoutes from './routes/dashboard.routes';
import frigoAdminRoutes from './routes/frigo.admin.routes';
import frigoPublicRoutes from './routes/frigo.public.routes';
import userAuthRoutes from './routes/userAuth.routes';
import purchaseRoutes from './routes/purchase.routes';
import pushPublicRoutes from './routes/push.public.routes';
import pushAdminRoutes from './routes/push.admin.routes';

initVapid();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({
  origin: (origin, cb) => {
    const allowed = process.env.CLIENT_URL ?? 'http://localhost:5173';
    // Autorise localhost et toute IP du réseau local (192.168.x.x, 10.x.x.x, etc.)
    if (!origin || origin === allowed || /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origine non autorisée — ${origin}`));
    }
  },
}));
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
app.use('/api/v1/public', votePublicRoutes);
app.use('/api/v1/admin/votes', voteAdminRoutes);
app.use('/api/v1/admin/dashboard', dashboardRoutes);
app.use('/api/v1/admin/frigos', frigoAdminRoutes);
app.use('/api/v1/public', frigoPublicRoutes);
app.use('/api/v1/public/user/auth', userAuthRoutes);
app.use('/api/v1/public/user/purchases', purchaseRoutes);
app.use('/api/v1/public/user/push', pushPublicRoutes);
app.use('/api/v1/admin/notifications', pushAdminRoutes);

// Servir le build React si le dossier dist existe
const clientDist = path.join(process.cwd(), 'client', 'dist');
logger.info(`[static] clientDist = ${clientDist} | exists = ${fs.existsSync(clientDist)}`);
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
});

export default app;
