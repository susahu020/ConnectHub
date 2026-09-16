import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import {
  createReviewCycle,
  getReviewCycles,
  activateReviewCycle,
  closeReviewCycle,
  deleteReviewCycle,
  getMyPerformanceReviews,
  getReviewsToGive,
  getCycleReviews,
  submitReview,
  acknowledgeReview,
} from '../controllers/performance.controller';

const router = Router();

// ==========================================
// PERFORMANCE REVIEW MODULE ROUTES
// ==========================================
// Review Cycles — Admin-managed
router.post('/hr/performance/cycles', authenticate as any, authorize(['ADMIN']), createReviewCycle as any);
router.get('/hr/performance/cycles', authenticate as any, getReviewCycles as any);
router.post('/hr/performance/cycles/:id/activate', authenticate as any, authorize(['ADMIN']), activateReviewCycle as any);
router.post('/hr/performance/cycles/:id/close', authenticate as any, authorize(['ADMIN']), closeReviewCycle as any);
router.delete('/hr/performance/cycles/:id', authenticate as any, authorize(['ADMIN']), deleteReviewCycle as any);
router.get('/hr/performance/cycles/:id/reviews', authenticate as any, authorize(['ADMIN', 'MANAGER']), getCycleReviews as any);

// Reviews
router.get('/hr/performance/reviews/mine', authenticate as any, getMyPerformanceReviews as any);
router.get('/hr/performance/reviews/to-give', authenticate as any, getReviewsToGive as any);
router.put('/hr/performance/reviews/:id/submit', authenticate as any, submitReview as any);
router.put('/hr/performance/reviews/:id/acknowledge', authenticate as any, acknowledgeReview as any);

export default router;
