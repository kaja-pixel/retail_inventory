import { Router } from 'express';
import { getDashboardSummary, getRecentActivities } from '../controllers/dashboard.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/summary', getDashboardSummary);
router.get('/recent-activities', getRecentActivities);

export default router;

