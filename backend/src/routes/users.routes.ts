import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { upload } from '../middleware/upload.middleware';
import { fileUploadRateLimiter } from '../middleware/rateLimiter';
import { updateProfileSchema } from '../utils/validation';
import {
  getProfile,
  getMyPermissions,
  updateProfile,
  getDirectory,
  getOrgChart,
  getDashboardStats,
  updateSettings,
  getSessions,
  deleteSession,
  getDashboardLayout,
  saveDashboardLayout,
  getProfileById,
  uploadAvatar,
  uploadCover,
  updateProfileById,
  uploadAvatarById,
  addSkill,
  updateSkill,
  deleteSkill,
  addExperience,
  updateExperience,
  deleteExperience,
  addEducation,
  updateEducation,
  deleteEducation,
  addCertification,
  updateCertification,
  deleteCertification,
  getUserActivityLogs,
} from '../controllers/user.controller';
import { exportMyData, deleteMyAccount } from '../controllers/privacy.controller';

const router = Router();

// ==========================================
// USER & PROFILE
// ==========================================
router.get('/users/profile', authenticate as any, getProfile as any);
router.get('/users/permissions', authenticate as any, getMyPermissions as any);
router.get('/users/profile/:userId', authenticate as any, getProfileById as any);
router.put('/users/profile', authenticate as any, validate(updateProfileSchema), updateProfile as any);
router.put('/users/profile/:userId', authenticate as any, validate(updateProfileSchema), updateProfileById as any);
router.get('/users/me/export', authenticate as any, exportMyData as any);
router.delete('/users/me', authenticate as any, deleteMyAccount as any);
router.post('/users/avatar', authenticate as any, fileUploadRateLimiter, upload.single('avatar'), uploadAvatar as any);
router.post('/users/:userId/avatar', authenticate as any, fileUploadRateLimiter, upload.single('avatar'), uploadAvatarById as any);
router.post('/users/cover', authenticate as any, fileUploadRateLimiter, upload.single('cover'), uploadCover as any);

router.post('/users/skills', authenticate as any, addSkill as any);
router.put('/users/skills/:id', authenticate as any, updateSkill as any);
router.delete('/users/skills/:id', authenticate as any, deleteSkill as any);

router.post('/users/experience', authenticate as any, addExperience as any);
router.put('/users/experience/:id', authenticate as any, updateExperience as any);
router.delete('/users/experience/:id', authenticate as any, deleteExperience as any);

router.post('/users/education', authenticate as any, addEducation as any);
router.put('/users/education/:id', authenticate as any, updateEducation as any);
router.delete('/users/education/:id', authenticate as any, deleteEducation as any);

router.post('/users/certifications', authenticate as any, addCertification as any);
router.put('/users/certifications/:id', authenticate as any, updateCertification as any);
router.delete('/users/certifications/:id', authenticate as any, deleteCertification as any);

router.get('/users/activity', authenticate as any, getUserActivityLogs as any);

router.get('/users/directory', authenticate as any, getDirectory as any);
router.get('/users/org-chart', authenticate as any, getOrgChart as any);
router.get('/users/dashboard-stats', authenticate as any, getDashboardStats as any);
router.put('/users/settings', authenticate as any, updateSettings as any);
router.get('/users/sessions', authenticate as any, getSessions as any);
router.delete('/users/sessions/:id', authenticate as any, deleteSession as any);
router.get('/users/settings/dashboard-layout', authenticate as any, getDashboardLayout as any);
router.post('/users/settings/dashboard-layout', authenticate as any, saveDashboardLayout as any);

export default router;
