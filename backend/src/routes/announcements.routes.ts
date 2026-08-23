import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { createAnnouncementSchema } from '../utils/validation';
import {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementDetails,
  getAnnouncementViewers,
  deleteAnnouncement,
  likeAnnouncement,
  addComment,
  deleteComment,
} from '../controllers/announcement.controller';

const router = Router();

// ==========================================
// ANNOUNCEMENTS
// ==========================================
router.post('/announcements', authenticate as any, checkPermission('Announcements', 'Create'), validate(createAnnouncementSchema), createAnnouncement as any);
router.get('/announcements', authenticate as any, getAnnouncements as any);
router.get('/announcements/:id', authenticate as any, getAnnouncementDetails as any);
router.get('/announcements/:id/views', authenticate as any, getAnnouncementViewers as any);
router.delete('/announcements/:id', authenticate as any, checkPermission('Announcements', 'Delete'), deleteAnnouncement as any);
router.post('/announcements/:id/like', authenticate as any, likeAnnouncement as any);
router.post('/announcements/:id/comment', authenticate as any, addComment as any);
router.delete('/announcements/:id/comment/:commentId', authenticate as any, deleteComment as any);

export default router;
