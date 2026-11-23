import { Router } from 'express';
import {
  getProducts,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdminOrSuperAdmin, requireSuperAdmin } from '../middleware/role.middleware.js';
import { validateBody, ProductSchema, ProductUpdateSchema } from '../validators/index.js';

const router = Router();

router.use(authenticateToken);

router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', requireAdminOrSuperAdmin, validateBody(ProductSchema), createProduct);
router.put('/:id', requireAdminOrSuperAdmin, validateBody(ProductUpdateSchema), updateProduct);
router.delete('/:id', requireSuperAdmin, deleteProduct);

export default router;

