import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  getPublicOrganizationSettings,
  updateOrganizationSettings,
  uploadOrganizationLogo,
  uploadOrganizationFavicon,
} from '../controllers/organization.controller';

const router = Router();

// ==========================================
// ORGANIZATION SETTINGS
// ==========================================
router.get('/organization/settings', getPublicOrganizationSettings as any);
router.put('/admin/organization-settings', authenticate as any, authorize(['ADMIN']), updateOrganizationSettings as any);
router.post('/admin/organization-settings/logo', authenticate as any, authorize(['ADMIN']), upload.single('logo'), uploadOrganizationLogo as any);
router.post('/admin/organization-settings/favicon', authenticate as any, authorize(['ADMIN']), upload.single('favicon'), uploadOrganizationFavicon as any);

export default router;
