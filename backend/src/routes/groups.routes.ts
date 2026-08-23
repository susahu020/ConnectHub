import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { createGroupSchema } from '../utils/validation';
import {
  createGroup,
  getGroups,
  getGroupDetails,
  getGroupMessages,
  addMember,
  removeMember,
  leaveGroup,
  deleteGroup,
  updateGroup,
} from '../controllers/group.controller';

const router = Router();

// ==========================================
// GROUPS & CHANNELS
// ==========================================
router.post('/groups', authenticate as any, checkPermission('Groups', 'Create'), validate(createGroupSchema), createGroup as any);
router.get('/groups', authenticate as any, getGroups as any);
router.get('/groups/:id', authenticate as any, getGroupDetails as any);
router.get('/groups/:id/messages', authenticate as any, getGroupMessages as any);
router.post('/groups/:id/member', authenticate as any, addMember as any);
router.delete('/groups/:id/member', authenticate as any, removeMember as any);
router.post('/groups/:id/leave', authenticate as any, leaveGroup as any);
router.delete('/groups/:id', authenticate as any, deleteGroup as any);
router.put('/groups/:id', authenticate as any, updateGroup as any);

export default router;
