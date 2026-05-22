import { Router } from 'express';
import { listDishes, createDish, updateDish, deleteDish } from '../controllers/dish.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', listDishes);
router.post('/', createDish);
router.patch('/:id', updateDish);
router.delete('/:id', deleteDish);

export default router;
