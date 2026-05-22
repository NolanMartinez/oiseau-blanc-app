import { Router } from 'express';
import { getDishImage } from '../controllers/dish.controller';

const router = Router();

router.get('/dishes/:id/image', getDishImage);

export default router;
