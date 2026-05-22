import { Router } from 'express';
import { listDishes, createDish, updateDish, deleteDish, translateAllDishesHandler, suggestDescription } from '../controllers/dish.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', listDishes);
router.post('/suggest-description', suggestDescription);
router.post('/translate-all', translateAllDishesHandler);
router.post('/', createDish);
router.patch('/:id', updateDish);
router.delete('/:id', deleteDish);

export default router;
