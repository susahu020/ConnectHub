import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { emitDataUpdate } from '../utils/realtime';

// An unpublished (draft) page is only visible to its author and admins/managers
// (content moderators) — everyone else should not be able to list it, open it
// directly by id, or edit/delete it. Exported (rather than kept module-private)
// specifically so this logic has direct unit test coverage — see
// __tests__/wikiAccess.test.ts — instead of only being reachable through a
// full HTTP request against a live database.
export const isModerator = (role?: string) => role === 'ADMIN' || role === 'MANAGER';

export const canAccessPage = (page: { isPublished: boolean; authorId: string }, userId: string, role?: string) =>
  page.isPublished || page.authorId === userId || isModerator(role);

// Wiki editing is intentionally collaborative (see updateWikiPage below), so
// two people saving the same page within milliseconds of each other is a
// real scenario, not just a theoretical one. Reading "the latest version
// number" and then creating the next one are two separate round trips, so
// two concurrent requests can both read the same latest version and both
// try to create the same next version number. The @@unique([pageId,
// version]) constraint on WikiVersion turns the second one into a P2002
// error instead of a silent duplicate — this retries a few times with a
// fresh read of the latest version each time, so the losing request still
// succeeds (just gets renumbered) instead of surfacing an error to a user
// who did nothing wrong.
const createNextWikiVersion = async (
  pageId: string,
  title: string,
  content: string,
  changedById: string
) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const latest = await prisma.wikiVersion.findFirst({
      where: { pageId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version || 0) + 1;
    try {
      return await prisma.wikiVersion.create({
        data: { pageId, version: nextVersion, title, content, changedById },
      });
    } catch (err: any) {
      if (err?.code === 'P2002' && attempt < 4) continue;
      throw err;
    }
  }
};

// 1. GET /api/wiki — List pages
export const getWikiPages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { category, search } = req.query || {};
    const userId = req.user!.id;
    const role = req.user?.role;

    const whereClause: any = {
      OR: [
        { isPublished: true },
        { authorId: userId },
        ...(isModerator(role) ? [{ isPublished: false }] : []),
      ],
    };
    if (category) {
      whereClause.category = category as string;
    }
    if (search) {
      whereClause.AND = [
        {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            { content: { contains: search as string, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const pages = await prisma.wikiPage.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(pages);
  } catch (error) {
    next(error);
  }
};

// 2. GET /api/wiki/:id — Get single page
export const getWikiPage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const page = await prisma.wikiPage.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
        versions: {
          include: {
            changedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!page) {
      return res.status(404).json({ message: 'Wiki page not found.' });
    }

    if (!canAccessPage(page, req.user!.id, req.user?.role)) {
      return res.status(403).json({ message: 'This page is still a draft — only its author and admins can view it.' });
    }

    res.json(page);
  } catch (error) {
    next(error);
  }
};

// 3. POST /api/wiki — Create page
export const createWikiPage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authorId = req.user!.id;
    const { title, content, category, isPublished } = req.body || {};

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    const page = await prisma.wikiPage.create({
      data: {
        title,
        content,
        category: category || 'General',
        authorId,
        isPublished: isPublished === undefined ? true : !!isPublished,
      },
    });

    // Create version 1
    await createNextWikiVersion(page.id, page.title, page.content, authorId);

    emitDataUpdate(req, 'wiki');
    res.status(201).json(page);
  } catch (error) {
    next(error);
  }
};

// 4. PUT /api/wiki/:id — Update page. Editing a *published* page is intentionally
// collaborative (any employee can improve shared docs, like Confluence/Notion).
// Drafts are the exception — only the author/admin can even see them, so only
// they can edit them either.
export const updateWikiPage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const changedById = req.user!.id;
    const { title, content, category, isPublished } = req.body || {};

    const page = await prisma.wikiPage.findUnique({ where: { id } });

    if (!page) {
      return res.status(404).json({ message: 'Wiki page not found.' });
    }

    if (!canAccessPage(page, changedById, req.user?.role)) {
      return res.status(403).json({ message: 'This page is still a draft — only its author and admins can edit it.' });
    }

    const updated = await prisma.wikiPage.update({
      where: { id },
      data: {
        title: title !== undefined ? title : page.title,
        content: content !== undefined ? content : page.content,
        category: category !== undefined ? category : page.category,
        isPublished: isPublished !== undefined ? !!isPublished : page.isPublished,
      },
    });

    // Create new version history record
    await createNextWikiVersion(id, updated.title, updated.content, changedById);

    emitDataUpdate(req, 'wiki');
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// 5. DELETE /api/wiki/:id — Delete page. Unlike editing, deletion is permanent
// (there's no wiki recycle bin) — restricted to the author or an admin so a
// collaborative wiki can't be wiped by anyone who happens across a link. Managers
// count as moderators here too (same as they do for viewing/listing drafts above).
export const deleteWikiPage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const page = await prisma.wikiPage.findUnique({ where: { id } });

    if (!page) {
      return res.status(404).json({ message: 'Wiki page not found.' });
    }

    if (page.authorId !== req.user!.id && !isModerator(req.user?.role)) {
      return res.status(403).json({ message: 'Only the page author, a manager, or an admin can delete this page.' });
    }

    await prisma.wikiPage.delete({ where: { id } });
    emitDataUpdate(req, 'wiki');
    res.json({ message: 'Wiki page deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// 6. POST /api/wiki/:id/rollback/:versionId — Rollback to specific version
export const rollbackWikiPage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id, versionId } = req.params;
    const changedById = req.user!.id;

    const page = await prisma.wikiPage.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });

    if (!page) {
      return res.status(404).json({ message: 'Wiki page not found.' });
    }

    if (!canAccessPage(page, changedById, req.user?.role)) {
      return res.status(403).json({ message: 'This page is still a draft — only its author and admins can roll it back.' });
    }

    const versionRecord = page.versions.find(v => v.id === versionId);
    if (!versionRecord) {
      return res.status(404).json({ message: 'Version record not found.' });
    }

    const updated = await prisma.wikiPage.update({
      where: { id },
      data: {
        title: versionRecord.title,
        content: versionRecord.content,
      },
    });

    // Save as next version
    await createNextWikiVersion(id, updated.title, updated.content, changedById);

    emitDataUpdate(req, 'wiki');
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
