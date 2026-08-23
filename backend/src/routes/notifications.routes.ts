import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../controllers/notification.controller';

const router = Router();

// ==========================================
// NOTIFICATIONS
// ==========================================
router.get('/notifications', authenticate as any, getNotifications as any);
router.put('/notifications/:id/read', authenticate as any, markNotificationAsRead as any);
router.put('/notifications/read-all', authenticate as any, markAllNotificationsAsRead as any);
router.delete('/notifications/:id', authenticate as any, deleteNotification as any);

export default router;
