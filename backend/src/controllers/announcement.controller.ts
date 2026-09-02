import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { emitDataUpdate } from '../utils/realtime';
import { createManyNotifications } from '../services/notification.service';

export const createAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const creatorId = req.user?.id!;
    const { title, content, priority, isPinned, expiresAt, scheduledFor, departmentId, imageUrl, pdfUrl } = req.body;

    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      res.status(403).json({ message: 'Forbidden. Only Admins and Managers can make announcements.' });
      return;
    }

    const scheduledForDate = scheduledFor ? new Date(scheduledFor) : null;
    const isScheduledForFuture = !!scheduledForDate && scheduledForDate.getTime() > Date.now();

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'NORMAL',
        isPinned: isPinned || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        scheduledFor: scheduledForDate,
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

    // Notify users (Real-time and Email preferences integrated). Skipped
    // for a future-scheduled announcement — notifying everyone now, ahead
    // of getAnnouncements actually making it visible to them, would both
    // spoil and confuse (a notification linking to something they can't
    // open yet). There's no delayed-job/cron infrastructure in this app
    // to fire the notification at the scheduled time instead, so for now
    // people simply see it in their feed once it goes live rather than
    // getting a push notification at that exact moment — a real gap
    // (documented as a "pending" item) but a safer default than the
    // alternative of an immediately-spoiling notification.
    if (!isScheduledForFuture) {
      const employees = await prisma.user.findMany({
        where: {
          departmentId: departmentId || undefined,
          id: { not: creatorId },
        },
        select: { id: true },
      });

      const io = req.app.get('io');
      await createManyNotifications({
        notifications: employees.map((emp) => ({
          userId: emp.id,
          title: `Announcement: ${title}`,
          message: `${req.user?.firstName} posted a new announcement: "${title}"`,
          type: 'ANNOUNCEMENT',
          relatedId: announcement.id,
          emailFeature: 'ANNOUNCEMENT' as any,
        })),
        io,
      });
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: creatorId,
        action: 'CREATE_ANNOUNCEMENT',
        details: `Created announcement "${title}"`,
      },
    });

    emitDataUpdate(req, 'announcements');
    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
};

export const getAnnouncements = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { departmentId, priority, pinnedOnly } = req.query;
    const userId = req.user?.id;
    const isModerator = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';

    const whereClause: any = {
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
        // A scheduled (future-dated) announcement is only visible to its
        // creator or an Admin ahead of time — so the person who scheduled
        // it can confirm/preview it, and an Admin can audit what's queued
        // up — everyone else sees it once scheduledFor passes, exactly
        // like a null scheduledFor (publish immediately) always has.
        {
          OR: [
            { scheduledFor: null },
            { scheduledFor: { lte: new Date() } },
            { createdById: userId },
            ...(req.user?.role === 'ADMIN' ? [{}] : []),
          ],
        },
      ],
    };

    // A department filter is only honored if it's the requester's own department,
    // or they're a manager/admin — otherwise someone could pass an arbitrary
    // departmentId to read announcements scoped to a team they're not on.
    const canViewOtherDepartments = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
    if (departmentId && (canViewOtherDepartments || departmentId === req.user?.departmentId)) {
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

    // Same department-scoping getAnnouncements (list) already enforces —
    // an org-wide announcement (departmentId: null) is visible to everyone,
    // but one scoped to a specific department should only be readable by
    // that department's members, plus managers/admins who can see every
    // department. Without this, anyone who had (or guessed, or was sent) an
    // announcement's id could read its full content, comments, and like
    // list regardless of department, even though the list view correctly
    // hides it from them.
    const canViewOtherDepartments = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
    if (announcement.departmentId && !canViewOtherDepartments && announcement.departmentId !== req.user?.departmentId) {
      res.status(403).json({ message: 'This announcement is scoped to a department you are not part of.' });
      return;
    }

    // Record a per-user read receipt (idempotent — viewing again doesn't
    // create duplicate rows or inflate the counter). This is what lets the
    // creator/admin see exactly who has and hasn't read a critical
    // announcement, instead of only an anonymous aggregate count.
    const existingView = await prisma.announcementView.findUnique({
      where: { announcementId_userId: { announcementId: id, userId } },
    });

    if (!existingView) {
      await prisma.announcementView.create({
        data: { announcementId: id, userId },
      });
      await prisma.announcement.update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
      });
    }

    const isLiked = announcement.likes.some((like) => like.userId === userId);

    res.status(200).json({
      ...announcement,
      isLiked,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Read-receipt roster for an announcement: who has viewed it and when,
 * plus who in the target audience (department, or everyone if org-wide)
 * still hasn't. Restricted to the announcement's creator or an Admin,
 * since it exposes individual read status.
 */
export const getAnnouncementViewers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        views: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } } },
          orderBy: { viewedAt: 'asc' },
        },
      },
    });

    if (!announcement) {
      res.status(404).json({ message: 'Announcement not found.' });
      return;
    }

    if (req.user?.role !== 'ADMIN' && announcement.createdById !== userId) {
      res.status(403).json({ message: 'Forbidden. Only the creator or an Admin can view the read receipts.' });
      return;
    }

    // Target audience: everyone in the department if it's a department
    // announcement, otherwise everyone in the org.
    const audience = await prisma.user.findMany({
      where: announcement.departmentId ? { departmentId: announcement.departmentId } : {},
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
    });

    const viewedUserIds = new Set(announcement.views.map((v: any) => v.userId));
    const notViewed = audience.filter((u: any) => !viewedUserIds.has(u.id));

    res.status(200).json({
      viewed: announcement.views.map((v: any) => ({ ...v.user, viewedAt: v.viewedAt })),
      notViewed,
      totalAudience: audience.length,
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

    emitDataUpdate(req, 'announcements');
    res.status(200).json({ message: 'Announcement deleted successfully.', announcementId: id });
  } catch (error) {
    next(error);
  }
};

// Previously there was no way to fix a typo or update details on a posted
// announcement short of deleting it and posting a new one — which also
// throws away its read-receipt history (AnnouncementView rows) and its
// likes/comments. Mirrors deleteAnnouncement's authorization (creator or
// Admin), and is additionally gated at the route level by
// checkPermission('Announcements', 'Update') so an org can grant a
// non-admin custom role edit rights without also granting delete.
export const updateAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;
    const { title, content, priority, isPinned, expiresAt, scheduledFor, departmentId, imageUrl, pdfUrl } = req.body;

    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      res.status(404).json({ message: 'Announcement not found.' });
      return;
    }

    if (req.user?.role !== 'ADMIN' && announcement.createdById !== userId) {
      res.status(403).json({ message: 'Forbidden. Only the creator or an Admin can edit announcements.' });
      return;
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        content: content !== undefined ? content : undefined,
        priority: priority !== undefined ? priority : undefined,
        isPinned: isPinned !== undefined ? !!isPinned : undefined,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
        scheduledFor: scheduledFor !== undefined ? (scheduledFor ? new Date(scheduledFor) : null) : undefined,
        departmentId: departmentId !== undefined ? departmentId : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        pdfUrl: pdfUrl !== undefined ? pdfUrl : undefined,
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, role: true } },
        department: { select: { id: true, name: true } },
      },
    });

    emitDataUpdate(req, 'announcements');
    res.status(200).json({ announcement: updated });
  } catch (error) {
    next(error);
  }
};

export const likeAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: announcementId } = req.params;
    const userId = req.user?.id!;

    const announcement = await prisma.announcement.findUnique({ where: { id: announcementId }, select: { departmentId: true } });
    if (!announcement) {
      res.status(404).json({ message: 'Announcement not found.' });
      return;
    }
    const canViewOtherDepartments = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
    if (announcement.departmentId && !canViewOtherDepartments && announcement.departmentId !== req.user?.departmentId) {
      res.status(403).json({ message: 'This announcement is scoped to a department you are not part of.' });
      return;
    }

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

    const parentAnnouncement = await prisma.announcement.findUnique({ where: { id: announcementId }, select: { departmentId: true } });
    if (!parentAnnouncement) {
      res.status(404).json({ message: 'Announcement not found.' });
      return;
    }
    const canViewOtherDepartments = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
    if (parentAnnouncement.departmentId && !canViewOtherDepartments && parentAnnouncement.departmentId !== req.user?.departmentId) {
      res.status(403).json({ message: 'This announcement is scoped to a department you are not part of.' });
      return;
    }

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
