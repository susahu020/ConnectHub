import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { getTeams, getTeamById, createTeam, updateTeam, deleteTeam, addTeamMember, removeTeamMember } from '../controllers/team.controller';

const router = Router();

// ==========================================
// TEAMS
// ==========================================
router.get('/teams', authenticate as any, getTeams as any);
router.get('/teams/:id', authenticate as any, getTeamById as any);
router.post('/teams', authenticate as any, authorize(['ADMIN']), createTeam as any);
router.put('/teams/:id', authenticate as any, authorize(['ADMIN']), updateTeam as any);
router.delete('/teams/:id', authenticate as any, authorize(['ADMIN']), deleteTeam as any);
router.post('/teams/:id/members', authenticate as any, authorize(['ADMIN']), addTeamMember as any);
router.delete('/teams/:id/members/:userId', authenticate as any, authorize(['ADMIN']), removeTeamMember as any);

export default router;
