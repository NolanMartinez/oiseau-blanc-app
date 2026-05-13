import { Router } from 'express';
import { requireSubscriber } from '../middleware/userAuth';
import { listNotifications, markSeen } from '../controllers/userNotifications.controller';

const router = Router();

router.get('/', requireSubscriber, listNotifications);
router.patch('/seen', requireSubscriber, markSeen);

export default router;
