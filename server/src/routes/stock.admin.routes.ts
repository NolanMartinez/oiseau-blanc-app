import { Router } from 'express';
import { upsertStock, updateStock, deleteStock } from '../controllers/stock.controller';
import { requireDelivery } from '../middleware/deliveryAuth';

const router = Router();
router.use(requireDelivery);

router.post('/', upsertStock);
router.patch('/:id', updateStock);
router.delete('/:id', deleteStock);

export default router;
