import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import {
  getRoles,
  getRoleDetails,
  createRole,
  updateRolePermissions,
  duplicateRole,
  deleteRole,
  assignRole,
} from '../controllers/rbac.controller';

const router = Router();

// ==========================================
// ROLE BASED ACCESS CONTROL (RBAC)
// ==========================================
router.get('/rbac/roles', authenticate as any, authorize(['ADMIN']), getRoles as any);
router.get('/rbac/roles/:id', authenticate as any, authorize(['ADMIN']), getRoleDetails as any);
router.post('/rbac/roles', authenticate as any, authorize(['ADMIN']), createRole as any);
router.post('/rbac/roles/:id/permissions', authenticate as any, authorize(['ADMIN']), updateRolePermissions as any);
router.post('/rbac/roles/:id/duplicate', authenticate as any, authorize(['ADMIN']), duplicateRole as any);
router.delete('/rbac/roles/:id', authenticate as any, authorize(['ADMIN']), deleteRole as any);
router.post('/rbac/users/:userId/role', authenticate as any, authorize(['ADMIN']), assignRole as any);

export default router;
