import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  reorderCategories,
  deleteCategory,
} from '../controllers/category.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', listCategories);
router.post('/', createCategory);
router.put('/reorder', reorderCategories);
router.patch('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
