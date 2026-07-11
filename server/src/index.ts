import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import { initVapid } from './services/push.service';
import { initEmail } from './services/email.service';
import { ensureCategories } from './services/categories';
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
import userNotificationsRoutes from './routes/userNotifications.routes';
import dishAdminRoutes from './routes/dish.admin.routes';
import categoryAdminRoutes from './routes/category.admin.routes';
import dishPublicRoutes from './routes/dish.public.routes';
import stockAdminRoutes from './routes/stock.admin.routes';
import recommendationRoutes from './routes/recommendation.routes';
import livreurRoutes from './routes/livreur.routes';
import accountingRoutes from './routes/accounting.routes';
import loyaltyAdminRoutes from './routes/loyalty.admin.routes';
import companyAdminRoutes from './routes/company.admin.routes';

initVapid();
initEmail();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({
  origin: (origin, cb) => {
    const allowed = process.env.CLIENT_URL ?? 'http://localhost:5173';
    const isLocalNetwork = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin ?? '');
    const isRailway = /\.railway\.app$/.test(origin ?? '');
    const isNetlify = /\.netlify\.app$/.test(origin ?? '');
    // Domaine de prod (app.friggo.fr, www.friggo.fr, friggo.fr).
    const isFriggo = /(^|\.)friggo\.fr$/.test((origin ?? '').replace(/^https?:\/\//, ''));
    // La borne (Tauri) envoie une origine type `tauri://localhost` / `*.tauri.localhost`.
    const isTauri = (origin ?? '').startsWith('tauri://') || /tauri\.localhost$/.test(origin ?? '');
    // Les apps natives Capacitor (iOS/Android) envoient `capacitor://localhost`,
    // `ionic://localhost` ou `http(s)://localhost`.
    const o = origin ?? '';
    const isCapacitor =
      o.startsWith('capacitor://') || o.startsWith('ionic://') ||
      o === 'http://localhost' || o === 'https://localhost';
    if (!origin || origin === allowed || isLocalNetwork || isRailway || isNetlify || isFriggo || isTauri || isCapacitor) {
      cb(null, true);
    } else {
      // Ne JAMAIS throw ici (sinon erreur 500) : on refuse juste les en-têtes CORS.
      cb(null, false);
    }
  },
}));
// 25 Mo : la borne peut pousser sa carte complète avec les images (base64).
app.use(express.json({ limit: '25mb' }));

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
app.use('/api/v1/admin/dishes', dishAdminRoutes);
app.use('/api/v1/admin/categories', categoryAdminRoutes);
app.use('/api/v1/public', dishPublicRoutes);
app.use('/api/v1/admin/stock', stockAdminRoutes);
app.use('/api/v1/admin/recommendations', recommendationRoutes);
app.use('/api/v1/public/user/auth', userAuthRoutes);
app.use('/api/v1/public/user/purchases', purchaseRoutes);
app.use('/api/v1/public/user/push', pushPublicRoutes);
app.use('/api/v1/public/user/notifications', userNotificationsRoutes);
app.use('/api/v1/admin/notifications', pushAdminRoutes);
app.use('/api/v1/livreur', livreurRoutes);
app.use('/api/v1/admin/accounting', accountingRoutes);
app.use('/api/v1/admin/loyalty', loyaltyAdminRoutes);
app.use('/api/v1/admin/company', companyAdminRoutes);

// Mises à jour de l'app borne (auto-updater Tauri) : sert /opt/friggo/updates
// (latest.json + l'installeur signé). La borne interroge /updates/latest.json.
const updatesDir = path.join(process.cwd(), '..', 'updates');
app.use('/updates', express.static(updatesDir));

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
  void ensureCategories();
});

export default app;
