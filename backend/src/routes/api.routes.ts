import { Router } from 'express';
import { rateLimiter } from '../middleware/rateLimiter';

import authRoutes from './auth.routes';
import invitationRoutes from './invitations.routes';
import usersRoutes from './users.routes';
import rbacRoutes from './rbac.routes';
import meetingsRoutes from './meetings.routes';
import chatRoutes from './chat.routes';
import groupsRoutes from './groups.routes';
import tasksRoutes from './tasks.routes';
import announcementsRoutes from './announcements.routes';
import filesRoutes from './files.routes';
import notificationsRoutes from './notifications.routes';
import searchRoutes from './search.routes';
import adminRoutes from './admin.routes';
import teamsRoutes from './teams.routes';
import organizationRoutes from './organization.routes';
import wikiRoutes from './wiki.routes';
import workflowsRoutes from './workflows.routes';
import hrRoutes from './hr.routes';
import performanceRoutes from './performance.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

// Apply global rate limiting to all API endpoints
router.use(rateLimiter);

// Each module router below defines its own full paths (e.g. '/auth/login',
// '/hr/leaves') rather than being mounted under a prefix here, since a few
// modules (invitations, admin/teams/organization) share URL space that
// doesn't map 1:1 onto controller boundaries. See the audit note this split
// resolves: this file used to be a single ~600-line route list.
router.use(authRoutes);
router.use(invitationRoutes);
router.use(usersRoutes);
router.use(rbacRoutes);
router.use(meetingsRoutes);
router.use(chatRoutes);
router.use(groupsRoutes);
router.use(tasksRoutes);
router.use(announcementsRoutes);
router.use(filesRoutes);
router.use(notificationsRoutes);
router.use(searchRoutes);
router.use(adminRoutes);
router.use(teamsRoutes);
router.use(organizationRoutes);
router.use(wikiRoutes);
router.use(workflowsRoutes);
router.use(hrRoutes);
router.use(performanceRoutes);
router.use(analyticsRoutes);

export default router;
