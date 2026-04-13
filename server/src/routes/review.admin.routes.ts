import { Router } from 'express';
import { listReviews, deleteReview } from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', listReviews);
router.delete('/:id', deleteReview);

export default router;
