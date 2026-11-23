import { Router } from 'express';
import {
  getUsers,
  getRoles,
  getUserById,
  updateUserRole,
  updateUserStatus,
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdminOrSuperAdmin, requireSuperAdmin } from '../middleware/role.middleware.js';
import { validateBody, UserRoleUpdateSchema, UserStatusUpdateSchema } from '../validators/index.js';

const router = Router();

router.use(authenticateToken);

router.get('/roles', requireAdminOrSuperAdmin, getRoles);
router.get('/', requireAdminOrSuperAdmin, getUsers);
router.get('/:id', requireAdminOrSuperAdmin, getUserById);
router.patch('/:id/role', requireSuperAdmin, validateBody(UserRoleUpdateSchema), updateUserRole);
router.patch('/:id/status', requireSuperAdmin, validateBody(UserStatusUpdateSchema), updateUserStatus);

export default router;

