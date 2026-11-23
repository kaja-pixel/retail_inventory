import { Router } from 'express';
import {
  getLowStockProducts,
  getInventoryTransactions,
  adjustStock,
} from '../controllers/inventory.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdminOrSuperAdmin } from '../middleware/role.middleware.js';
import { validateBody, StockAdjustmentSchema } from '../validators/index.js';

const router = Router();

router.use(authenticateToken);

router.get('/low-stock', getLowStockProducts);
router.get('/transactions', getInventoryTransactions);
router.post('/adjustments', requireAdminOrSuperAdmin, validateBody(StockAdjustmentSchema), adjustStock);

export default router;

