import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getRecommendations } from '../services/recommendation.service';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  const data = await getRecommendations();
  res.json(data);
});

export default router;
