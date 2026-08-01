import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;

    const updated = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    res.status(200).json({ message: 'Notification marked as read.', count: updated.count });

    // Notifications are read from a plain useState in the dashboard layout,
    // not React Query, so they aren't covered by the generic data_update
    // system. Push directly to this user's own other active sessions (a
    // second browser tab/device) so the same notification doesn't stay
    // showing as unread there until they happen to reload.
    req.app.get('io')?.to(`user:${userId}`).emit('notification_read', { id });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;

    const updated = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({ message: 'All notifications marked as read.', count: updated.count });

    req.app.get('io')?.to(`user:${userId}`).emit('all_notifications_read');
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;

    await prisma.notification.deleteMany({
      where: { id, userId },
    });

    res.status(200).json({ message: 'Notification deleted successfully.', notificationId: id });

    req.app.get('io')?.to(`user:${userId}`).emit('notification_deleted', { id });
  } catch (error) {
    next(error);
  }
};
