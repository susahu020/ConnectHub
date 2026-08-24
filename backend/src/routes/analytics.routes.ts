import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { getAnalyticsStats } from '../controllers/analytics.controller';

const router = Router();

// ==========================================
// ANALYTICS DASHBOARD
// ==========================================
router.get('/analytics', authenticate as any, authorize(['ADMIN', 'MANAGER']), getAnalyticsStats as any);

export default router;
