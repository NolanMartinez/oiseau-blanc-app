import { Router } from 'express';
import { listReviews, deleteReview, exportReviews } from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/export', exportReviews);
router.get('/', listReviews);
router.delete('/:id', deleteReview);

export default router;
