import { Router } from 'express';
import { createReview } from '../controllers/review.controller';
import { requireSubscriber } from '../middleware/userAuth';

const router = Router();

router.post('/reviews', requireSubscriber, createReview);

export default router;
