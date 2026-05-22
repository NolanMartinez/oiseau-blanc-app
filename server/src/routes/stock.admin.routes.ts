import { Router } from 'express';
import { upsertStock, updateStock, deleteStock } from '../controllers/stock.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.post('/', upsertStock);
router.patch('/:id', updateStock);
router.delete('/:id', deleteStock);

export default router;
