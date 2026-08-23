import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { checkPermission } from '../middleware/rbac.middleware';
import {
  getAuditLogs,
  exportAuditLogs,
  getSystemUsers,
  updateUserRole,
  toggleUserSuspension,
  toggleUserActive,
  getDepartmentStats,
  createDepartment,
  getDepartments,
  deleteDepartment,
  updateDepartment,
  adminUpdateUser,
  adminDeleteUser,
  adminChangeUserPassword,
  getEmailFeatureSettings,
  updateEmailFeatureSettings,
  sendTestEmail,
  sendFeatureTestEmail,
  getSystemHealth,
  sendTestHealthAlert,
} from '../controllers/admin.controller';
// adminLogoutUser/adminLogoutAll live in auth.controller (they operate on
// session state, same as logout/logoutAll), but are mounted under /admin
// since they're admin-only actions on OTHER users' sessions.
import { adminLogoutUser, adminLogoutAll } from '../controllers/auth.controller';

const router = Router();

// ==========================================
// ADMIN PANEL
// ==========================================
router.get('/admin/audit-logs', authenticate as any, authorize(['ADMIN']), getAuditLogs as any);
router.get('/admin/audit-logs/export', authenticate as any, authorize(['ADMIN']), exportAuditLogs as any);
router.get('/admin/users', authenticate as any, authorize(['ADMIN']), getSystemUsers as any);
router.put('/admin/users/:userId/role', authenticate as any, authorize(['ADMIN']), updateUserRole as any);
router.put('/admin/users/:userId/suspension', authenticate as any, authorize(['ADMIN']), toggleUserSuspension as any);
router.put('/admin/users/:userId/active', authenticate as any, authorize(['ADMIN']), toggleUserActive as any);
router.put('/admin/users/:id', authenticate as any, authorize(['ADMIN']), adminUpdateUser as any);
router.delete('/admin/users/:id', authenticate as any, authorize(['ADMIN']), adminDeleteUser as any);
router.put('/admin/users/:id/password', authenticate as any, authorize(['ADMIN']), adminChangeUserPassword as any);
router.get('/admin/stats/departments', authenticate as any, checkPermission('Reports', 'Export'), getDepartmentStats as any);
router.post('/admin/departments', authenticate as any, authorize(['ADMIN']), createDepartment as any);
router.post('/admin/logout-user', authenticate as any, authorize(['ADMIN']), adminLogoutUser as any);
router.post('/admin/logout-all', authenticate as any, authorize(['ADMIN']), adminLogoutAll as any);
router.get('/admin/departments', authenticate as any, getDepartments as any);
router.delete('/admin/departments/:id', authenticate as any, authorize(['ADMIN']), deleteDepartment as any);
router.put('/admin/departments/:id', authenticate as any, authorize(['ADMIN']), updateDepartment as any);
router.get('/admin/email-settings', authenticate as any, authorize(['ADMIN']), getEmailFeatureSettings as any);
router.put('/admin/email-settings', authenticate as any, authorize(['ADMIN']), updateEmailFeatureSettings as any);
router.post('/admin/email-settings/test', authenticate as any, authorize(['ADMIN']), sendTestEmail as any);
router.post('/admin/email-settings/test/:feature', authenticate as any, authorize(['ADMIN']), sendFeatureTestEmail as any);
router.get('/admin/system-health', authenticate as any, authorize(['ADMIN']), getSystemHealth as any);
router.post('/admin/system-health/test-alert', authenticate as any, authorize(['ADMIN']), sendTestHealthAlert as any);

export default router;
