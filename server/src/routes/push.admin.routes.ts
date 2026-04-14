import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { sendBroadcast } from '../controllers/push.controller';

const router = Router();

router.use(requireAuth);
router.post('/send', sendBroadcast);

export default router;
