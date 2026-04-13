import { Router } from 'express';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '../controllers/admin.controller';
import { requireAuth, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// Toutes les routes admins nécessitent d'être authentifié + super admin
router.use(requireAuth, requireSuperAdmin);

router.get('/', listAdmins);
router.post('/', createAdmin);
router.patch('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

export default router;
