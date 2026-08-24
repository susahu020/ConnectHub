import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/rbac.middleware';
import {
  inviteUser,
  verifyInvitation,
  completeOnboarding,
  getInvitations,
  revokeInvitation,
  resendInvitation,
} from '../controllers/invitation.controller';

const router = Router();

router.post('/auth/invite', authenticate as any, checkPermission('Users', 'Update'), inviteUser as any);
router.get('/auth/invite/verify', verifyInvitation);
router.post('/auth/invite/complete', completeOnboarding);
router.get('/admin/invitations', authenticate as any, checkPermission('Users', 'Update'), getInvitations as any);
router.delete('/admin/invitations/:id', authenticate as any, checkPermission('Users', 'Update'), revokeInvitation as any);
router.post('/admin/invitations/:id/resend', authenticate as any, checkPermission('Users', 'Update'), resendInvitation as any);

export default router;
