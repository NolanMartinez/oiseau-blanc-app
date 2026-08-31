import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getAccountingStats, exportAccounting } from '../controllers/accounting.controller';
import { runDailyReport } from '../services/dailyReport.service';

const router = Router();
router.use(requireAuth);

router.get('/stats', getAccountingStats);
router.get('/export', exportAccounting);

// Déclenche manuellement l'envoi du rapport quotidien (test sans attendre minuit).
router.post('/daily-report/run', async (_req, res) => {
  try {
    await runDailyReport();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : 'Erreur' });
  }
});

export default router;
