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

      // 2. Messages — scoped to DMs the user is a party to and groups they
      // belong to (same participant model enforced in chat.controller.ts's
      // getDirectMessages/getGroupMessages), so search can't be used to read
      // other people's conversations. Also excludes messages the user has
      // deleted for themselves, matching getDirectMessages.
      prisma.message.findMany({
        where: {
          AND: [
            { content: { contains: q, mode: 'insensitive' } },
            { NOT: { isDeletedFor: { has: req.user!.id } } },
            {
              OR: [
                { senderId: req.user!.id },
                { receiverId: req.user!.id },
                { group: { members: { some: { userId: req.user!.id } } } },
              ],
            },
          ],
        },
        take: 5,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      }),

      // 3. Files / Documents. The file browser (getFilesAndFolders) and
      // every other file query in file.controller.ts filter out
      // soft-deleted files (isDeleted: false) — recycle-bin files are meant
      // to stay out of normal browsing until restored or purged. This was
      // the one file query in the app that didn't, so a file someone
      // deleted (including its direct download `url`, since nothing here
      // narrows the selected fields) stayed fully discoverable through
      // search the whole time it sat in the recycle bin.
      prisma.file.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
          isDeleted: false,
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

      // 5. Announcements — same department scoping as getAnnouncements in
      // announcement.controller.ts: org-wide (departmentId: null) or the
      // user's own department, unless they're a Manager/Admin who can see
      // every department's announcements.
      prisma.announcement.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
              ],
            },
            ...(req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER'
              ? []
              : [{
                  OR: [
                    { departmentId: null },
                    { departmentId: req.user?.departmentId || undefined },
                  ],
                }]),
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
