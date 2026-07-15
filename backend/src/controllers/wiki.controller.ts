import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// 1. GET /api/wiki — List pages
export const getWikiPages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { category, search } = req.query || {};
    
    const whereClause: any = {};
    if (category) {
      whereClause.category = category as string;
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
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
    await prisma.wikiVersion.create({
      data: {
        pageId: page.id,
        version: 1,
        title: page.title,
        content: page.content,
        changedById: authorId,
      },
    });

    res.status(201).json(page);
  } catch (error) {
    next(error);
  }
};

// 4. PUT /api/wiki/:id — Update page
export const updateWikiPage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const changedById = req.user!.id;
    const { title, content, category, isPublished } = req.body || {};

    const page = await prisma.wikiPage.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!page) {
      return res.status(404).json({ message: 'Wiki page not found.' });
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

    // Compute next version number
    const latestVer = page.versions[0]?.version || 0;
    
    // Create new version history record
    await prisma.wikiVersion.create({
      data: {
        pageId: id,
        version: latestVer + 1,
        title: updated.title,
        content: updated.content,
        changedById,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// 5. DELETE /api/wiki/:id — Delete page
export const deleteWikiPage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const page = await prisma.wikiPage.findUnique({ where: { id } });

    if (!page) {
      return res.status(404).json({ message: 'Wiki page not found.' });
    }

    await prisma.wikiPage.delete({ where: { id } });
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
    const latestVer = page.versions[0]?.version || 0;
    await prisma.wikiVersion.create({
      data: {
        pageId: id,
        version: latestVer + 1,
        title: updated.title,
        content: updated.content,
        changedById,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
