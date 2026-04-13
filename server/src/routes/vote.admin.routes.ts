import { Router } from 'express';
import { listVotes, createVote, updateVote, deleteVote, getVoteResults } from '../controllers/vote.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', listVotes);
router.post('/', createVote);
router.patch('/:id', updateVote);
router.delete('/:id', deleteVote);
router.get('/:id/results', getVoteResults);

export default router;
