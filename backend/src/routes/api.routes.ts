import { Router } from 'express';
import {
  inviteUser,
  verifyInvitation,
  completeOnboarding
} from '../controllers/invitation.controller';

import {
  createMeeting,
  getMeetingByCode,
  startMeeting,
  endMeeting,
  getMeetings,
} from '../controllers/meeting.controller';

import { globalSearch } from '../controllers/search.controller';

import {
  getWikiPages,
  getWikiPage,
  createWikiPage,
  updateWikiPage,
  deleteWikiPage,
  rollbackWikiPage,
} from '../controllers/wiki.controller';

import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from '../controllers/workflow.controller';

// Middlewares
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { checkPermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { upload } from '../middleware/upload.middleware';
import { rateLimiter } from '../middleware/rateLimiter';

// Validation schemas
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  createTaskSchema,
  updateTaskSchema,
  createAnnouncementSchema,
  createGroupSchema,
} from '../utils/validation';

// Controllers
import {
  register,
  login,
  verifyEmail,
  refresh,
  logout,
  logoutAll,
  extendSession,
  adminLogoutUser,
  adminLogoutAll,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyLogin2FA,
  setup2FA,
  activate2FA,
  disable2FA,
  sendContactMessage,
} from '../controllers/auth.controller';

import {
  getProfile,
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

import {
  getDirectMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markAsRead,
  getRecentChats,
  pinMessage,
  bookmarkMessage,
  getBookmarks,
  createPoll,
  votePoll,
  forwardMessage,
  clearChat,
} from '../controllers/chat.controller';

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

import {
  createTask,
  getTasks,
  getTaskDetails,
  updateTask,
  deleteTask,
  addTaskComment,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  logTaskTime,
  getTaskTimeLogs,
  addTaskDependency,
  removeTaskDependency,
} from '../controllers/task.controller';

import {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementDetails,
  deleteAnnouncement,
  likeAnnouncement,
  addComment,
  deleteComment,
} from '../controllers/announcement.controller';

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
  moveItem,
  createShareLink,
  accessSharedFile,
  scanFile,
  ocrFile,
  watermarkFile,
  bulkDownload,
} from '../controllers/file.controller';

import {
  getAuditLogs,
  getSystemUsers,
  updateUserRole,
  toggleUserVerification,
  getDepartmentStats,
  createDepartment,
  getDepartments,
  deleteDepartment,
  getSystemMetrics,
  adminUpdateUser,
  adminDeleteUser,
  adminChangeUserPassword,
} from '../controllers/admin.controller';

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../controllers/notification.controller';

import {
  getRoles,
  getRoleDetails,
  createRole,
  updateRolePermissions,
  duplicateRole,
  deleteRole,
  assignRole,
} from '../controllers/rbac.controller';

import {
  getLeaves,
  requestLeave,
  getLeaveBalances,
  updateLeaveStatus,
  getTodayStatus,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getAttendanceLogs,
  getHolidays,
  createHoliday,
  deleteHoliday,
  getExpenseClaims,
  createExpenseClaim,
  updateExpenseStatus,
  getPayslips,
  generatePayslip,
  updatePayslipStatus,
  getShifts,
  createShift,
  getShiftAssignments,
  assignShift,
  createSwapRequest,
  getSwapRequests,
  updateSwapRequestStatus,
  getRecognitions,
  getMyWishes,
  getCelebrationWishes,
  createRecognition,
  deleteLeaveRequest,
  updateLeaveBalance,
  updateAttendanceLog,
  deleteAttendanceLog,
  deleteExpenseClaim,
  deletePayslip,
  deleteShiftAssignment,
  deleteShift,
  deleteRecognition,
  getCelebrations
} from '../controllers/hr.controller';

import { getAnalyticsStats } from '../controllers/analytics.controller';

const router = Router();

// Apply global rate limiting to all API endpoints
router.use(rateLimiter);

// ==========================================
// AUTHENTICATION
// ==========================================
router.post('/auth/register', validate(registerSchema), register);
router.post('/auth/login', validate(loginSchema), login);
router.post('/auth/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/auth/2fa/verify-login', verifyLogin2FA as any);
router.post('/auth/2fa/setup', authenticate as any, setup2FA as any);
router.post('/auth/2fa/activate', authenticate as any, activate2FA as any);
router.post('/auth/2fa/disable', authenticate as any, disable2FA as any);
router.post('/auth/refresh', refresh);
router.post('/auth/logout', authenticate as any, logout as any);
router.post('/auth/logout-all', authenticate as any, logoutAll as any);
router.post('/auth/extend-session', authenticate as any, extendSession as any);
router.post('/auth/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/auth/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/auth/change-password', authenticate as any, changePassword as any);
router.post('/auth/contact', sendContactMessage as any);
router.post('/auth/invite', authenticate as any, checkPermission('Users', 'Update'), inviteUser as any);
router.get('/auth/invite/verify', verifyInvitation);
router.post('/auth/invite/complete', completeOnboarding);

// ==========================================
// USER & PROFILE
// ==========================================
router.get('/users/profile', authenticate as any, getProfile as any);
router.get('/users/profile/:userId', authenticate as any, getProfileById as any);
router.put('/users/profile', authenticate as any, validate(updateProfileSchema), updateProfile as any);
router.put('/users/profile/:userId', authenticate as any, updateProfileById as any);
router.post('/users/avatar', authenticate as any, upload.single('avatar'), uploadAvatar as any);
router.post('/users/:userId/avatar', authenticate as any, upload.single('avatar'), uploadAvatarById as any);
router.post('/users/cover', authenticate as any, upload.single('cover'), uploadCover as any);

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

// ==========================================
// MEETINGS (persisted source of truth backing the live socket signaling)
// ==========================================
router.get('/meetings', authenticate as any, getMeetings as any);
router.post('/meetings', authenticate as any, createMeeting as any);
router.get('/meetings/:code', authenticate as any, getMeetingByCode as any);
router.post('/meetings/:code/start', authenticate as any, startMeeting as any);
router.post('/meetings/:code/end', authenticate as any, endMeeting as any);

// ==========================================
// CHAT & MESSAGING
// ==========================================
router.get('/chats/recent', authenticate as any, getRecentChats as any);
router.get('/chats/direct/:contactId', authenticate as any, getDirectMessages as any);
router.post('/chats/message', authenticate as any, sendMessage as any);
router.put('/chats/message/:id', authenticate as any, editMessage as any);
router.delete('/chats/message/:id', authenticate as any, deleteMessage as any);
router.post('/chats/message/:id/reaction', authenticate as any, addReaction as any);
router.delete('/chats/message/:id/reaction', authenticate as any, removeReaction as any);
router.post('/chats/read', authenticate as any, markAsRead as any);
router.post('/chats/message/:id/pin', authenticate as any, pinMessage as any);
router.post('/chats/message/:id/bookmark', authenticate as any, bookmarkMessage as any);
router.get('/chats/bookmarks', authenticate as any, getBookmarks as any);
router.post('/chats/message/poll', authenticate as any, createPoll as any);
router.post('/chats/message/poll/:optionId/vote', authenticate as any, votePoll as any);
router.post('/chats/message/:id/forward', authenticate as any, forwardMessage as any);
router.post('/chats/clear', authenticate as any, clearChat as any);

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

// ==========================================
// TASKS & KANBAN
// ==========================================
router.post('/tasks', authenticate as any, checkPermission('Tasks', 'Create'), validate(createTaskSchema), createTask as any);
router.get('/tasks', authenticate as any, getTasks as any);
router.get('/tasks/:id', authenticate as any, getTaskDetails as any);
router.put('/tasks/:id', authenticate as any, checkPermission('Tasks', 'Update'), validate(updateTaskSchema), updateTask as any);
router.delete('/tasks/:id', authenticate as any, checkPermission('Tasks', 'Delete'), deleteTask as any);
router.post('/tasks/:id/comment', authenticate as any, addTaskComment as any);
router.post('/tasks/:id/subtasks', authenticate as any, createSubtask as any);
router.put('/tasks/subtasks/:subtaskId', authenticate as any, toggleSubtask as any);
router.delete('/tasks/subtasks/:subtaskId', authenticate as any, deleteSubtask as any);
router.post('/tasks/:id/timelogs', authenticate as any, logTaskTime as any);
router.get('/tasks/:id/timelogs', authenticate as any, getTaskTimeLogs as any);
router.post('/tasks/:id/dependencies', authenticate as any, addTaskDependency as any);
router.delete('/tasks/:id/dependencies/:dependsOnTaskId', authenticate as any, removeTaskDependency as any);

router.get('/projects', authenticate as any, getProjects as any);
router.post('/projects', authenticate as any, checkPermission('Tasks', 'Create'), createProject as any);
router.put('/projects/:id', authenticate as any, checkPermission('Tasks', 'Update'), updateProject as any);
router.delete('/projects/:id', authenticate as any, checkPermission('Tasks', 'Delete'), deleteProject as any);

// ==========================================
// ANNOUNCEMENTS
// ==========================================
router.post('/announcements', authenticate as any, checkPermission('Announcements', 'Create'), validate(createAnnouncementSchema), createAnnouncement as any);
router.get('/announcements', authenticate as any, getAnnouncements as any);
router.get('/announcements/:id', authenticate as any, getAnnouncementDetails as any);
router.delete('/announcements/:id', authenticate as any, checkPermission('Announcements', 'Delete'), deleteAnnouncement as any);
router.post('/announcements/:id/like', authenticate as any, likeAnnouncement as any);
router.post('/announcements/:id/comment', authenticate as any, addComment as any);
router.delete('/announcements/:id/comment/:commentId', authenticate as any, deleteComment as any);

// ==========================================
// FILE EXPLORER
// ==========================================
router.post('/files/upload', authenticate as any, checkPermission('Files', 'Create'), upload.single('file'), uploadFile as any);
router.post('/files/folder', authenticate as any, createFolder as any);
router.get('/files/explorer', authenticate as any, getFilesAndFolders as any);
router.put('/files/:id', authenticate as any, upload.single('file'), updateFile as any);
router.delete('/files/:id', authenticate as any, checkPermission('Files', 'Delete'), deleteFile as any);
router.delete('/files/folders/:id', authenticate as any, deleteFolder as any);
router.get('/files/recycle-bin', authenticate as any, getRecycleBin as any);
router.post('/files/:id/restore', authenticate as any, restoreItem as any);
router.delete('/files/:id/permanent', authenticate as any, deletePermanently as any);
router.post('/files/:id/move', authenticate as any, moveItem as any);
router.post('/files/:id/share', authenticate as any, createShareLink as any);
router.get('/files/shared/:accessKey', accessSharedFile as any);
router.get('/files/bulk-download', authenticate as any, bulkDownload as any);
router.post('/files/:id/scan', authenticate as any, scanFile as any);
router.post('/files/:id/ocr', authenticate as any, ocrFile as any);
router.get('/files/:id/watermark', authenticate as any, watermarkFile as any);

// ==========================================
// NOTIFICATIONS
// ==========================================
router.get('/notifications', authenticate as any, getNotifications as any);
router.put('/notifications/:id/read', authenticate as any, markNotificationAsRead as any);
router.put('/notifications/read-all', authenticate as any, markAllNotificationsAsRead as any);
router.delete('/notifications/:id', authenticate as any, deleteNotification as any);

// ==========================================
// SEARCH
// ==========================================
router.get('/search', authenticate as any, globalSearch as any);

// ==========================================
// ADMIN PANEL
// ==========================================
router.get('/admin/audit-logs', authenticate as any, authorize(['ADMIN']), getAuditLogs as any);
router.get('/admin/users', authenticate as any, authorize(['ADMIN']), getSystemUsers as any);
router.get('/admin/system/metrics', authenticate as any, authorize(['ADMIN']), getSystemMetrics as any);
router.put('/admin/users/:userId/role', authenticate as any, checkPermission('Users', 'Update'), updateUserRole as any);
router.put('/admin/users/:userId/verification', authenticate as any, authorize(['ADMIN']), toggleUserVerification as any);
router.put('/admin/users/:id', authenticate as any, authorize(['ADMIN']), adminUpdateUser as any);
router.delete('/admin/users/:id', authenticate as any, authorize(['ADMIN']), adminDeleteUser as any);
router.put('/admin/users/:id/password', authenticate as any, authorize(['ADMIN']), adminChangeUserPassword as any);
router.get('/admin/stats/departments', authenticate as any, checkPermission('Reports', 'Export'), getDepartmentStats as any);
router.post('/admin/departments', authenticate as any, authorize(['ADMIN']), createDepartment as any);
router.post('/admin/logout-user', authenticate as any, authorize(['ADMIN']), adminLogoutUser as any);
router.post('/admin/logout-all', authenticate as any, authorize(['ADMIN']), adminLogoutAll as any);
router.get('/admin/departments', authenticate as any, getDepartments as any);
router.delete('/admin/departments/:id', authenticate as any, authorize(['ADMIN']), deleteDepartment as any);

// ==========================================
// COMPANY WIKI
// ==========================================
router.get('/wiki', authenticate as any, getWikiPages as any);
router.get('/wiki/:id', authenticate as any, getWikiPage as any);
router.post('/wiki', authenticate as any, createWikiPage as any);
router.put('/wiki/:id', authenticate as any, updateWikiPage as any);
router.delete('/wiki/:id', authenticate as any, deleteWikiPage as any);
router.post('/wiki/:id/rollback/:versionId', authenticate as any, rollbackWikiPage as any);

// ==========================================
// WORKFLOW AUTOMATION
// ==========================================
router.get('/workflows', authenticate as any, getWorkflows as any);
router.post('/workflows', authenticate as any, createWorkflow as any);
router.put('/workflows/:id', authenticate as any, updateWorkflow as any);
router.delete('/workflows/:id', authenticate as any, deleteWorkflow as any);

// ==========================================
// HR MODULE ROUTES
// ==========================================
// Leaves
router.get('/hr/leaves', authenticate as any, getLeaves as any);
router.post('/hr/leaves', authenticate as any, requestLeave as any);
router.get('/hr/leaves/balances', authenticate as any, getLeaveBalances as any);
router.put('/hr/leaves/:id/status', authenticate as any, authorize(['ADMIN', 'MANAGER']), updateLeaveStatus as any);
router.delete('/hr/leaves/:id', authenticate as any, deleteLeaveRequest as any);
router.put('/hr/leaves/balances/:id', authenticate as any, authorize(['ADMIN']), updateLeaveBalance as any);

// Attendance
router.get('/hr/attendance/today', authenticate as any, getTodayStatus as any);
router.post('/hr/attendance/clock-in', authenticate as any, clockIn as any);
router.post('/hr/attendance/clock-out', authenticate as any, clockOut as any);
router.post('/hr/attendance/break-start', authenticate as any, startBreak as any);
router.post('/hr/attendance/break-end', authenticate as any, endBreak as any);
router.get('/hr/attendance/logs', authenticate as any, getAttendanceLogs as any);
router.put('/hr/attendance/logs/:id', authenticate as any, authorize(['ADMIN']), updateAttendanceLog as any);
router.delete('/hr/attendance/logs/:id', authenticate as any, authorize(['ADMIN']), deleteAttendanceLog as any);

// Holidays
router.get('/hr/holidays', authenticate as any, getHolidays as any);
router.post('/hr/holidays', authenticate as any, authorize(['ADMIN', 'MANAGER']), createHoliday as any);
router.delete('/hr/holidays/:id', authenticate as any, authorize(['ADMIN', 'MANAGER']), deleteHoliday as any);

// Expense Claims
router.get('/hr/expenses', authenticate as any, getExpenseClaims as any);
router.post('/hr/expenses', authenticate as any, createExpenseClaim as any);
router.put('/hr/expenses/:id/status', authenticate as any, authorize(['ADMIN', 'MANAGER']), updateExpenseStatus as any);
router.delete('/hr/expenses/:id', authenticate as any, deleteExpenseClaim as any);

// Payslips
router.get('/hr/payslips', authenticate as any, getPayslips as any);
router.post('/hr/payslips', authenticate as any, authorize(['ADMIN', 'MANAGER']), generatePayslip as any);
router.put('/hr/payslips/:id/status', authenticate as any, authorize(['ADMIN', 'MANAGER']), updatePayslipStatus as any);
router.delete('/hr/payslips/:id', authenticate as any, authorize(['ADMIN']), deletePayslip as any);

// Shifts
router.get('/hr/shifts', authenticate as any, getShifts as any);
router.post('/hr/shifts', authenticate as any, authorize(['ADMIN', 'MANAGER']), createShift as any);
router.get('/hr/shifts/assignments', authenticate as any, getShiftAssignments as any);
router.post('/hr/shifts/assign', authenticate as any, authorize(['ADMIN', 'MANAGER']), assignShift as any);
router.post('/hr/shifts/swap', authenticate as any, createSwapRequest as any);
router.get('/hr/shifts/swaps', authenticate as any, getSwapRequests as any);
router.put('/hr/shifts/swaps/:id/status', authenticate as any, updateSwapRequestStatus as any);
router.delete('/hr/shifts/assignments/:id', authenticate as any, authorize(['ADMIN']), deleteShiftAssignment as any);
router.delete('/hr/shifts/:id', authenticate as any, authorize(['ADMIN']), deleteShift as any);

// Recognition
router.get('/hr/recognitions', authenticate as any, getRecognitions as any);
router.get('/hr/my-wishes', authenticate as any, getMyWishes as any);
router.get('/hr/celebration-wishes', authenticate as any, getCelebrationWishes as any);
router.post('/hr/recognitions', authenticate as any, createRecognition as any);
router.delete('/hr/recognitions/:id', authenticate as any, authorize(['ADMIN']), deleteRecognition as any);
router.get('/hr/celebrations', authenticate as any, getCelebrations as any);

// Analytics Dashboard
router.get('/analytics', authenticate as any, authorize(['ADMIN', 'MANAGER']), getAnalyticsStats as any);


export default router;
