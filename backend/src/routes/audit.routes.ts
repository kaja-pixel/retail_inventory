import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdminOrSuperAdmin } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/', requireAdminOrSuperAdmin, getAuditLogs);

export default router;

