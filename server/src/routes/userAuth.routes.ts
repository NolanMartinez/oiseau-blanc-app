import { Router } from 'express';
import { requestOtp, verifyOtp, register, loginWithPassword, getMe, updateMe, setFavori, deleteMe, exportMyData } from '../controllers/userAuth.controller';
import { requireSubscriber } from '../middleware/userAuth';

const router = Router();

router.post('/register', register);
router.post('/login', loginWithPassword);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', requireSubscriber, getMe);
router.patch('/me', requireSubscriber, updateMe);
router.patch('/frigo-favori', requireSubscriber, setFavori);
router.get('/my-data', requireSubscriber, exportMyData);
router.delete('/me', requireSubscriber, deleteMe);

export default router;
