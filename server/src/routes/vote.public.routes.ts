import { Router } from 'express';
import { listOpenVotes, castVote } from '../controllers/vote.controller';

const router = Router();

router.get('/votes', listOpenVotes);
router.post('/votes/:id/vote', castVote);

export default router;
