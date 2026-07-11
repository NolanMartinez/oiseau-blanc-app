import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getCompanySettings, updateCompanySettings } from '../controllers/receipt.controller';

const router = Router();

router.use(requireAuth);
router.get('/settings', getCompanySettings);
router.put('/settings', updateCompanySettings);

export default router;
