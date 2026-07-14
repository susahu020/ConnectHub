import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/db';
import { isConfigured as isCloudinaryConfigured, cloudinary } from '../config/cloudinary';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const uploadFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uploaderId = req.user?.id!;
    const { folderId } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded.' });
      return;
    }

    let fileUrl = '';
    
    if (isCloudinaryConfigured) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'auto',
          folder: 'connecthub',
        });
        fileUrl = result.secure_url;
        
        // Remove file from local temp uploads folder
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Cloudinary upload error, falling back to local file path:', err);
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        fileUrl = `${serverUrl}/uploads/${file.filename}`;
      }
    } else {
      // Local fallback url path
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      fileUrl = `${serverUrl}/uploads/${file.filename}`;
    }

    const dbFile = await prisma.file.create({
      data: {
        name: file.originalname,
        url: fileUrl,
        fileType: path.extname(file.originalname).substring(1).toUpperCase() || 'UNKNOWN',
        size: file.size,
        uploaderId,
        folderId: folderId || null,
        versions: {
          create: {
            url: fileUrl,
            version: 1,
            uploaderId,
          },
        },
      },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json(dbFile);
  } catch (error) {
    next(error);
  }
};

export const createFolder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const createdById = req.user?.id!;
    const { name, parentId } = req.body;

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
        createdById,
      },
    });

    res.status(201).json(folder);
  } catch (error) {
    next(error);
  }
};

export const getFilesAndFolders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { folderId, search } = req.query;

    const currentFolderId = folderId ? (folderId as string) : null;

    // Search query or folder hierarchy filter
    const folderWhere: any = { isDeleted: false };
    const fileWhere: any = { isDeleted: false };

    if (search) {
      folderWhere.name = { contains: search as string, mode: 'insensitive' };
      fileWhere.name = { contains: search as string, mode: 'insensitive' };
    } else {
      folderWhere.parentId = currentFolderId;
      fileWhere.folderId = currentFolderId;
    }

    const [folders, files] = await prisma.$transaction([
      prisma.folder.findMany({
        where: folderWhere,
        orderBy: { name: 'asc' },
      }),
      prisma.file.findMany({
        where: fileWhere,
        include: { uploader: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Parent breadcrumbs trail
    let breadcrumbs: any[] = [];
    if (currentFolderId && !search) {
      let folderObj = await prisma.folder.findUnique({ where: { id: currentFolderId } });
      while (folderObj) {
        breadcrumbs.unshift({ id: folderObj.id, name: folderObj.name });
        if (folderObj.parentId) {
          folderObj = await prisma.folder.findUnique({ where: { id: folderObj.parentId } });
        } else {
          break;
        }
      }
    }

    res.status(200).json({
      folders,
      files,
      breadcrumbs,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const uploaderId = req.user?.id!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded.' });
      return;
    }

    const existingFile = await prisma.file.findUnique({
      where: { id },
      include: { versions: true },
    });

    if (!existingFile) {
      res.status(404).json({ message: 'File not found.' });
      return;
    }

    let fileUrl = '';
    if (isCloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'auto',
          folder: 'connecthub',
        });
        fileUrl = result.secure_url;
        fs.unlinkSync(file.path);
      } catch (err) {
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        fileUrl = `${serverUrl}/uploads/${file.filename}`;
      }
    } else {
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      fileUrl = `${serverUrl}/uploads/${file.filename}`;
    }

    const newVersion = existingFile.version + 1;

    const updatedFile = await prisma.file.update({
      where: { id },
      data: {
        url: fileUrl,
        size: file.size,
        version: newVersion,
        versions: {
          create: {
            url: fileUrl,
            version: newVersion,
            uploaderId,
          },
        },
      },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
        versions: true,
      },
    });

    res.status(200).json(updatedFile);
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const existingFile = await prisma.file.findUnique({ where: { id } });
    if (!existingFile) {
      res.status(404).json({ message: 'File not found.' });
      return;
    }

    if (existingFile.uploaderId !== req.user?.id && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. You do not have permissions to delete this file.' });
      return;
    }

    await prisma.file.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.status(200).json({ message: 'File deleted successfully.', fileId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete a folder.
 */
export const deleteFolder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.folder.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Folder not found.' });
      return;
    }
    if (existing.createdById !== req.user?.id && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. You do not own this folder.' });
      return;
    }
    await prisma.folder.update({
      where: { id },
      data: { isDeleted: true },
    });
    res.status(200).json({ message: 'Folder moved to recycle bin.', folderId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * Get soft-deleted files and folders (Recycle Bin).
 */
export const getRecycleBin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const [folders, files] = await prisma.$transaction([
      prisma.folder.findMany({
        where: { isDeleted: true, createdById: userId },
        orderBy: { name: 'asc' },
      }),
      prisma.file.findMany({
        where: { isDeleted: true, uploaderId: userId },
        include: { uploader: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    res.status(200).json({ folders, files });
  } catch (error) {
    next(error);
  }
};

/**
 * Restore a soft-deleted file or folder.
 */
export const restoreItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'FILE' | 'FOLDER'

    if (type === 'FOLDER') {
      await prisma.folder.update({
        where: { id },
        data: { isDeleted: false },
      });
    } else {
      await prisma.file.update({
        where: { id },
        data: { isDeleted: false },
      });
    }
    res.status(200).json({ message: 'Item restored successfully.', itemId: id, type });
  } catch (error) {
    next(error);
  }
};

/**
 * Hard delete a file or folder permanently.
 */
export const deletePermanently = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'FILE' | 'FOLDER'

    if (type === 'FOLDER') {
      await prisma.folder.delete({ where: { id } });
    } else {
      const existingFile = await prisma.file.findUnique({ where: { id } });
      if (existingFile) {
        if (existingFile.url.includes('/uploads/')) {
          const filename = existingFile.url.split('/uploads/')[1];
          const localPath = path.join(process.cwd(), 'uploads', filename);
          if (fs.existsSync(localPath)) {
            try {
              fs.unlinkSync(localPath);
            } catch (err) {
              console.error('Failed to unlink local file:', err);
            }
          }
        }
        await prisma.file.delete({ where: { id } });
      }
    }
    res.status(200).json({ message: 'Item deleted permanently.', itemId: id, type });
  } catch (error) {
    next(error);
  }
};

/**
 * Move a file or folder to a target folder.
 */
export const moveItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { targetFolderId, type } = req.body; // type: 'FILE' | 'FOLDER'

    if (type === 'FOLDER') {
      if (targetFolderId === id) {
        res.status(400).json({ message: 'Cannot move folder inside itself.' });
        return;
      }
      await prisma.folder.update({
        where: { id },
        data: { parentId: targetFolderId || null },
      });
    } else {
      await prisma.file.update({
        where: { id },
        data: { folderId: targetFolderId || null },
      });
    }
    res.status(200).json({ message: 'Item moved successfully.', itemId: id, targetFolderId });
  } catch (error) {
    next(error);
  }
};

/**
 * Create shareable expiring link.
 */
export const createShareLink = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: fileId } = req.params;
    const { expiresHours } = req.body;
    const sharedById = req.user?.id!;

    const accessKey = require('crypto').randomBytes(16).toString('hex');
    let expiresAt: Date | null = null;
    if (expiresHours) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresHours);
    }

    await prisma.fileShare.create({
      data: {
        fileId,
        sharedById,
        accessKey,
        expiresAt,
      },
    });

    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const shareLink = `${serverUrl}/api/v1/files/shared/${accessKey}`;

    res.status(201).json({ shareLink, expiresAt });
  } catch (error) {
    next(error);
  }
};

/**
 * Access/Download a shared file via accessKey.
 */
export const accessSharedFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { accessKey } = req.params;

    const share = await prisma.fileShare.findUnique({
      where: { accessKey },
      include: { file: true },
    });

    if (!share) {
      res.status(404).send('Shared file link is invalid or expired.');
      return;
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      res.status(410).send('Shared link has expired.');
      return;
    }

    await prisma.fileShare.update({
      where: { id: share.id },
      data: { downloads: { increment: 1 } },
    });

    res.redirect(share.file.url);
  } catch (error) {
    next(error);
  }
};
