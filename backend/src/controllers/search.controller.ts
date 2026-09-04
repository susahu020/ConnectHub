import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export type SearchCategory =
  | 'users' | 'messages' | 'files' | 'tasks' | 'announcements'
  | 'departments' | 'groups' | 'teams' | 'wikiPages';

const ALL_CATEGORIES: SearchCategory[] = [
  'users', 'messages', 'files', 'tasks', 'announcements',
  'departments', 'groups', 'teams', 'wikiPages',
];

// Shared by both globalSearch (a 5-per-category preview across everything)
// and searchCategory (the "view all" drill-down for one category, added
// so a broad query no longer silently truncates at 5 with no way to see
// the rest). Returns just the model + where/include/select shape, so both
// endpoints build the identical query — every scoping rule below (message
// participant check, announcement department scoping, wiki draft
// visibility, recycle-bin exclusion) applies the same way to both, with
// no risk of the two drifting apart over time.
function buildCategoryQuery(category: SearchCategory, q: string, req: AuthenticatedRequest) {
  switch (category) {
    case 'users':
      return {
        model: prisma.user,
        where: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { designation: { contains: q, mode: 'insensitive' as const } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, email: true, designation: true, avatarUrl: true },
      };

    // Messages — scoped to DMs the user is a party to and groups they
    // belong to (same participant model enforced in chat.controller.ts's
    // getDirectMessages/getGroupMessages), so search can't be used to read
    // other people's conversations. Also excludes messages the user has
    // deleted for themselves, matching getDirectMessages.
    case 'messages':
      return {
        model: prisma.message,
        where: {
          AND: [
            { content: { contains: q, mode: 'insensitive' as const } },
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
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      };

    case 'files':
      return {
        model: prisma.file,
        where: { name: { contains: q, mode: 'insensitive' as const }, isDeleted: false },
      };

    case 'tasks':
      return {
        model: prisma.task,
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        },
      };

    // Announcements — same department scoping as getAnnouncements in
    // announcement.controller.ts: org-wide (departmentId: null) or the
    // user's own department, unless they're a Manager/Admin who can see
    // every department's announcements.
    case 'announcements':
      return {
        model: prisma.announcement,
        where: {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { content: { contains: q, mode: 'insensitive' as const } },
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
      };

    case 'departments':
      return {
        model: prisma.department,
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        },
      };

    case 'groups':
      return {
        model: prisma.group,
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        },
      };

    case 'teams':
      return {
        model: prisma.team,
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        },
      };

    case 'wikiPages':
      return {
        model: prisma.wikiPage,
        where: {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { content: { contains: q, mode: 'insensitive' as const } },
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
        select: { id: true, title: true, category: true, isPublished: true, updatedAt: true },
      };
  }
}

async function findCategory(category: SearchCategory, q: string, req: AuthenticatedRequest, take: number, skip: number) {
  const { model, where, select, include } = buildCategoryQuery(category, q, req) as any;
  return model.findMany({ where, select, include, take, skip });
}

async function countCategory(category: SearchCategory, q: string, req: AuthenticatedRequest) {
  const { model, where } = buildCategoryQuery(category, q, req) as any;
  return model.count({ where });
}

export const globalSearch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = (req.query.q as string || '').trim();

    if (!q) {
      res.json({
        users: [], messages: [], files: [], tasks: [], announcements: [],
        departments: [], groups: [], teams: [], wikiPages: [],
      });
      return;
    }

    // 5-per-category preview across everything, unchanged from before —
    // "view all" for one category is the new searchCategory endpoint below.
    const results = await Promise.all(
      ALL_CATEGORIES.map((cat) => findCategory(cat, q, req, 5, 0))
    );

    const response: Record<string, any> = {};
    ALL_CATEGORIES.forEach((cat, i) => {
      response[cat] = results[i];
    });
    res.json(response);
  } catch (error) {
    next(error);
  }
};

const PAGE_SIZE = 20;

// "View all results for X" — previously a broad query silently truncated
// at 5 results per category with no way to see the rest. Same
// scoping/visibility rules as globalSearch (they share buildCategoryQuery),
// just for one category at a time with real pagination.
export const searchCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = (req.query.q as string || '').trim();
    const category = req.query.category as SearchCategory;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);

    if (!q) {
      res.json({ results: [], total: 0, page, pageSize: PAGE_SIZE, hasMore: false });
      return;
    }

    if (!ALL_CATEGORIES.includes(category)) {
      res.status(400).json({ message: `Invalid search category. Expected one of: ${ALL_CATEGORIES.join(', ')}` });
      return;
    }

    const skip = (page - 1) * PAGE_SIZE;
    const [results, total] = await Promise.all([
      findCategory(category, q, req, PAGE_SIZE, skip),
      countCategory(category, q, req),
    ]);

    res.json({
      results,
      total,
      page,
      pageSize: PAGE_SIZE,
      hasMore: skip + results.length < total,
    });
  } catch (error) {
    next(error);
  }
};
