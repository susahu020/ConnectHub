import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const globalSearch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = (req.query.q as string || '').trim();

    if (!q) {
      res.json({
        users: [],
        messages: [],
        files: [],
        tasks: [],
        announcements: [],
        departments: [],
        groups: [],
        teams: [],
        wikiPages: [],
      });
      return;
    }

    // Parallel DB lookup queries
    const [users, messages, files, tasks, announcements, departments, groups, teams, wikiPages] = await Promise.all([
      // 1. Users
      prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { designation: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, designation: true, avatarUrl: true },
      }),

      // 2. Messages
      prisma.message.findMany({
        where: {
          content: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      }),

      // 3. Files / Documents
      prisma.file.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
        },
        take: 5,
      }),

      // 4. Tasks
      prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),

      // 5. Announcements
      prisma.announcement.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),

      // 6. Departments
      prisma.department.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),

      // 7. Groups (Channels/Chats)
      prisma.group.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),

      // 8. Teams
      prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),

      // 9. WikiPages (Knowledge Base Articles)
      prisma.wikiPage.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
              ],
            },
            {
              OR: [
                { isPublished: true },
                { authorId: req.user!.id },
                ...(req.user?.role === 'ADMIN' ? [{ isPublished: false }] : []),
              ],
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          isPublished: true,
          updatedAt: true,
        },
      }),
    ]);

    res.json({
      users,
      messages,
      files,
      tasks,
      announcements,
      departments,
      groups,
      teams,
      wikiPages,
    });
  } catch (error) {
    next(error);
  }
};
