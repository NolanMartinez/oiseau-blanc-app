import { Router } from 'express';
import { requireSubscriber } from '../middleware/userAuth';
import { getVapidKey, savePushSubscription, removePushSubscription } from '../controllers/push.controller';

const router = Router();

router.get('/vapid-key', getVapidKey);
router.post('/subscribe', requireSubscriber, savePushSubscription);
router.delete('/subscribe', requireSubscriber, removePushSubscription);

export default router;
