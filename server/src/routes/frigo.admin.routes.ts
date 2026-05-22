import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listFridges, getFridge } from '../controllers/frigo.controller';

const router = Router();
router.use(requireAuth);

router.get('/', listFridges);
router.get('/:id', getFridge);

export default router;
