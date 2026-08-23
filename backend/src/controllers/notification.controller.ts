import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { emitDataUpdateToUser } from '../utils/realtime';

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

    // Push to this user's own other active sessions (a second browser
    // tab/device) via the generic data_update system, scoped to just this
    // user's room, so the same notification doesn't stay showing as unread
    // there until they happen to reload.
    emitDataUpdateToUser(req, userId, 'notifications');
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

    emitDataUpdateToUser(req, userId, 'notifications');
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

    emitDataUpdateToUser(req, userId, 'notifications');
  } catch (error) {
    next(error);
  }
};
