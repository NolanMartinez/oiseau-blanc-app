import { Router } from 'express';
import { getDishImage, listPublicDishes } from '../controllers/dish.controller';

const router = Router();

router.get('/dishes', listPublicDishes);
router.get('/dishes/:id/image', getDishImage);

export default router;
