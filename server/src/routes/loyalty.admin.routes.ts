import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getLoyaltySettings, updateLoyaltySettings } from '../controllers/loyalty.controller';

const router = Router();

router.use(requireAuth);
router.get('/settings', getLoyaltySettings);
router.put('/settings', updateLoyaltySettings);

export default router;
