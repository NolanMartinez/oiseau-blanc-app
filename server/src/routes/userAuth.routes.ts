import { Router } from 'express';
import { requestOtp, verifyOtp, getMe } from '../controllers/userAuth.controller';
import { requireSubscriber } from '../middleware/userAuth';

const router = Router();

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', requireSubscriber, getMe);

export default router;
