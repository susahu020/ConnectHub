import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/rbac.middleware';
import { upload } from '../middleware/upload.middleware';
import { fileUploadRateLimiter, fileProcessingRateLimiter } from '../middleware/rateLimiter';
import {
  uploadFile,
  createFolder,
  getFilesAndFolders,
  updateFile,
  deleteFile,
  deleteFolder,
  getRecycleBin,
  restoreItem,
  deletePermanently,
  emptyRecycleBin,
  moveItem,
  createShareLink,
  accessSharedFile,
  scanFile,
  ocrFile,
  watermarkFile,
  bulkDownload,
} from '../controllers/file.controller';

const router = Router();

// ==========================================
// FILE EXPLORER
// ==========================================
// checkPermission('Files', <action>) is applied to every mutating route below,
// matching /files/upload and DELETE /files/:id — folder create/delete, file
// update, move, restore, and recycle-bin operations were previously missing
// this gate. The admin panel's role editor (admin/page.tsx) advertises
// granular Create/Update/Delete control over the "Files" module for custom
// roles, but only upload and file-delete actually enforced it — every other
// mutation here was reachable by anyone authenticated, regardless of what
// their role's Files permissions said, as long as they owned the item (or
// for emptyRecycleBin, unconditionally). The per-item ownership checks
// inside each controller still apply on top of this — this only restores
// the org-configurable layer.
router.post('/files/upload', authenticate as any, checkPermission('Files', 'Create'), fileUploadRateLimiter, upload.single('file'), uploadFile as any);
router.post('/files/folder', authenticate as any, checkPermission('Files', 'Create'), createFolder as any);
router.get('/files/explorer', authenticate as any, getFilesAndFolders as any);
router.put('/files/:id', authenticate as any, checkPermission('Files', 'Update'), fileUploadRateLimiter, upload.single('file'), updateFile as any);
router.delete('/files/:id', authenticate as any, checkPermission('Files', 'Delete'), deleteFile as any);
router.delete('/files/folders/:id', authenticate as any, checkPermission('Files', 'Delete'), deleteFolder as any);
router.get('/files/recycle-bin', authenticate as any, getRecycleBin as any);
router.delete('/files/recycle-bin', authenticate as any, checkPermission('Files', 'Delete'), emptyRecycleBin as any);
router.post('/files/:id/restore', authenticate as any, checkPermission('Files', 'Update'), restoreItem as any);
router.delete('/files/:id/permanent', authenticate as any, checkPermission('Files', 'Delete'), deletePermanently as any);
router.post('/files/:id/move', authenticate as any, checkPermission('Files', 'Update'), moveItem as any);
router.post('/files/:id/share', authenticate as any, createShareLink as any);
router.get('/files/shared/:accessKey', optionalAuthenticate as any, accessSharedFile as any);
router.get('/files/bulk-download', authenticate as any, bulkDownload as any);
router.post('/files/:id/scan', authenticate as any, scanFile as any);
router.post('/files/:id/ocr', authenticate as any, fileProcessingRateLimiter, ocrFile as any);
router.get('/files/:id/watermark', authenticate as any, fileProcessingRateLimiter, watermarkFile as any);

export default router;
