import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const createAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const creatorId = req.user?.id!;
    const { title, content, priority, isPinned, expiresAt, departmentId, imageUrl, pdfUrl } = req.body;

    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      res.status(403).json({ message: 'Forbidden. Only Admins and Managers can make announcements.' });
      return;
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'NORMAL',
        isPinned: isPinned || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: creatorId,
        departmentId: departmentId || null,
        imageUrl: imageUrl || null,
        pdfUrl: pdfUrl || null,
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, role: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // Notify users
    const employees = await prisma.user.findMany({
      where: {
        departmentId: departmentId || undefined,
        id: { not: creatorId },
      },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: employees.map((emp) => ({
        userId: emp.id,
        title: `Announcement: ${title}`,
        message: `${req.user?.firstName} posted a new announcement: "${title}"`,
        type: 'ANNOUNCEMENT',
        relatedId: announcement.id,
      })),
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: creatorId,
        action: 'CREATE_ANNOUNCEMENT',
        details: `Created announcement "${title}"`,
      },
    });

    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
};

export const getAnnouncements = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { departmentId, priority, pinnedOnly } = req.query;

    const whereClause: any = {
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
      ],
    };

    if (departmentId) {
      whereClause.departmentId = departmentId as string;
    } else {
      whereClause.AND.push({
        OR: [
          { departmentId: null },
          { departmentId: req.user?.departmentId || undefined },
        ],
      });
    }

    if (priority) {
      whereClause.priority = priority as any;
    }

    if (pinnedOnly === 'true') {
      whereClause.isPinned = true;
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        department: { select: { id: true, name: true } },
        _count: {
          select: { comments: true, likes: true },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

export const getAnnouncementDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        department: { select: { id: true, name: true } },
        comments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        likes: {
          select: { userId: true },
        },
      },
    });

    if (!announcement) {
      res.status(404).json({ message: 'Announcement not found.' });
      return;
    }

    // Increment view count asynchronously
    await prisma.announcement.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    const isLiked = announcement.likes.some((like) => like.userId === userId);

    res.status(200).json({
      ...announcement,
      isLiked,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;

    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      res.status(404).json({ message: 'Announcement not found.' });
      return;
    }

    if (req.user?.role !== 'ADMIN' && announcement.createdById !== userId) {
      res.status(403).json({ message: 'Forbidden. Only the creator or an Admin can delete announcements.' });
      return;
    }

    await prisma.announcement.delete({ where: { id } });

    res.status(200).json({ message: 'Announcement deleted successfully.', announcementId: id });
  } catch (error) {
    next(error);
  }
};

export const likeAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: announcementId } = req.params;
    const userId = req.user?.id!;

    const existingLike = await prisma.announcementLike.findUnique({
      where: { announcementId_userId: { announcementId, userId } },
    });

    if (existingLike) {
      // Unlike
      await prisma.announcementLike.delete({
        where: { announcementId_userId: { announcementId, userId } },
      });
      res.status(200).json({ liked: false });
    } else {
      // Like
      await prisma.announcementLike.create({
        data: { announcementId, userId },
      });
      res.status(201).json({ liked: true });
    }
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: announcementId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id!;

    const comment = await prisma.announcementComment.create({
      data: {
        announcementId,
        userId,
        content,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id!;

    const comment = await prisma.announcementComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      res.status(404).json({ message: 'Comment not found.' });
      return;
    }

    if (comment.userId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. You do not have permission to delete this comment.' });
      return;
    }

    await prisma.announcementComment.delete({ where: { id: commentId } });

    res.status(200).json({ message: 'Comment deleted successfully.', commentId });
  } catch (error) {
    next(error);
  }
};
