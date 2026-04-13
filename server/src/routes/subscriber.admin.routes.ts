import { Router } from 'express';
import { listSubscribers, deleteSubscriber, exportSubscribers } from '../controllers/subscriber.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/export', exportSubscribers);
router.get('/', listSubscribers);
router.delete('/:id', deleteSubscriber);

export default router;
