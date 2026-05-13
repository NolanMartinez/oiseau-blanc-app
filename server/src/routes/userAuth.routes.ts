import { Router } from 'express';
import { requestOtp, verifyOtp, getMe, updateMe, setFavori } from '../controllers/userAuth.controller';
import { requireSubscriber } from '../middleware/userAuth';

const router = Router();

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', requireSubscriber, getMe);
router.patch('/me', requireSubscriber, updateMe);
router.patch('/frigo-favori', requireSubscriber, setFavori);

export default router;
