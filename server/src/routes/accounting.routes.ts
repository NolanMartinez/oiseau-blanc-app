import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getAccountingStats, exportAccounting } from '../controllers/accounting.controller';

const router = Router();
router.use(requireAuth);

router.get('/stats', getAccountingStats);
router.get('/export', exportAccounting);

export default router;
