import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import inventoryRoutes from './inventory.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import notificationRoutes from './notification.routes.js';
import userRoutes from './user.routes.js';
import auditRoutes from './audit.routes.js';
import healthRoutes from './health.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/audit-logs', auditRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/health', healthRoutes);

export default apiRouter;
