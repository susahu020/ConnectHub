import { useAuthStore } from '../lib/store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

async function handleTokenRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Pass HttpOnly refresh cookie cross-origin
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data.accessToken || null;
  } catch (err) {
    return null;
  }
}

async function request<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  isMultipart = false
): Promise<T> {
  const store = useAuthStore.getState();
  let token = store.token;

  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include', // Ensure cookies are sent on every request
  };

  if (body) {
    config.body = isMultipart ? body : JSON.stringify(body);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // If 401 and not an auth bypass page, attempt rotation
  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    if (!isRefreshing) {
      isRefreshing = true;
      const newAccessToken = await handleTokenRefresh();
      isRefreshing = false;

      if (newAccessToken) {
        if (store.user) {
          store.setAuth(store.user, newAccessToken);
        }
        onRefreshed(newAccessToken);
      } else {
        // Refresh token expired too -> Logout
        store.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please log in again.');
      }
    } else {
      // Return a queued promise that resolves when the token refresh resolves
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          try {
            const updatedHeaders = { ...headers, 'Authorization': `Bearer ${newToken}` };
            const retryConfig = { ...config, headers: updatedHeaders };
            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, retryConfig);
            if (!retryResponse.ok) {
              const errData = await retryResponse.json();
              reject(new Error(errData.message || 'Retry request failed.'));
            } else {
              resolve(await retryResponse.json());
            }
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    const updatedToken = useAuthStore.getState().token;
    if (updatedToken) {
      const updatedHeaders = { ...headers, 'Authorization': `Bearer ${updatedToken}` };
      const retryConfig = { ...config, headers: updatedHeaders };
      response = await fetch(`${API_BASE_URL}${endpoint}`, retryConfig);
    }
  }

  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    store.logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => request('/auth/register', 'POST', body),
  login: (body: any) => request('/auth/login', 'POST', body),
  verifyEmail: (body: any) => request('/auth/verify-email', 'POST', body),
  forgotPassword: (body: any) => request('/auth/forgot-password', 'POST', body),
  resetPassword: (body: any) => request('/auth/reset-password', 'POST', body),
  changePassword: (body: any) => request('/auth/change-password', 'POST', body),
  verifyLogin2FA: (body: { tempToken: string; code: string }) => request('/auth/2fa/verify-login', 'POST', body),
  setup2FA: () => request('/auth/2fa/setup', 'POST'),
  activate2FA: (token: string) => request('/auth/2fa/activate', 'POST', { token }),
  disable2FA: (token: string) => request('/auth/2fa/disable', 'POST', { token }),
  logout: () => request('/auth/logout', 'POST'),
  logoutAll: () => request('/auth/logout-all', 'POST'),
  extendSession: () => request('/auth/extend-session', 'POST'),
  inviteUser: (body: { email: string; role: string }) => request('/auth/invite', 'POST', body),
  verifyInvitation: (token: string) => request(`/auth/invite/verify?token=${token}`),
  completeOnboarding: (body: any) => request('/auth/invite/complete', 'POST', body),
  
  // Users & Profile
  getProfile: () => request('/users/profile'),
  getProfileById: (userId: string) => request(`/users/profile/${userId}`),
  updateProfile: (body: any) => request('/users/profile', 'PUT', body),
  updateProfileById: (userId: string, body: any) => request(`/users/profile/${userId}`, 'PUT', body),
  uploadAvatar: (formData: FormData) => request('/users/avatar', 'POST', formData, true),
  uploadAvatarById: (userId: string, formData: FormData) => request(`/users/${userId}/avatar`, 'POST', formData, true),
  uploadCover: (formData: FormData) => request('/users/cover', 'POST', formData, true),
  
  addSkill: (body: any) => request('/users/skills', 'POST', body),
  updateSkill: (id: string, body: any) => request(`/users/skills/${id}`, 'PUT', body),
  deleteSkill: (id: string) => request(`/users/skills/${id}`, 'DELETE'),
  
  addExperience: (body: any) => request('/users/experience', 'POST', body),
  updateExperience: (id: string, body: any) => request(`/users/experience/${id}`, 'PUT', body),
  deleteExperience: (id: string) => request(`/users/experience/${id}`, 'DELETE'),
  
  addEducation: (body: any) => request('/users/education', 'POST', body),
  updateEducation: (id: string, body: any) => request(`/users/education/${id}`, 'PUT', body),
  deleteEducation: (id: string) => request(`/users/education/${id}`, 'DELETE'),
  
  addCertification: (body: any) => request('/users/certifications', 'POST', body),
  updateCertification: (id: string, body: any) => request(`/users/certifications/${id}`, 'PUT', body),
  deleteCertification: (id: string) => request(`/users/certifications/${id}`, 'DELETE'),
  
  getUserActivity: (params: string) => request(`/users/activity?${params}`),
  
  getDirectory: (params: string) => request(`/users/directory?${params}`),
  getDashboardStats: () => request('/users/dashboard-stats'),
  updateSettings: (body: any) => request('/users/settings', 'PUT', body),
  getSessions: () => request('/users/sessions'),
  deleteSession: (id: string) => request(`/users/sessions/${id}`, 'DELETE'),
  getDashboardLayout: () => request('/users/settings/dashboard-layout'),
  saveDashboardLayout: (layouts: any[]) => request('/users/settings/dashboard-layout', 'POST', { layouts }),
  
  // RBAC
  getRoles: () => request('/rbac/roles'),
  getRoleDetails: (id: string) => request(`/rbac/roles/${id}`),
  createRole: (body: { name: string; description?: string; parentId?: string; duplicateFromRoleId?: string }) => 
    request('/rbac/roles', 'POST', body),
  updateRolePermissions: (id: string, permissions: Array<{ module: string; action: string; isEnabled: boolean }>) => 
    request(`/rbac/roles/${id}/permissions`, 'POST', { permissions }),
  duplicateRole: (id: string, body: { newName: string; description?: string }) => 
    request(`/rbac/roles/${id}/duplicate`, 'POST', body),
  deleteRole: (id: string) => request(`/rbac/roles/${id}`, 'DELETE'),
  assignUserRole: (userId: string, roleId: string) => request(`/rbac/users/${userId}/role`, 'POST', { roleId }),

  // Meetings (REST source of truth backing the live socket signaling)
  createMeeting: (body?: { title?: string }) => request('/meetings', 'POST', body || {}),
  getMeetingByCode: (code: string) => request(`/meetings/${encodeURIComponent(code)}`),
  startMeeting: (code: string) => request(`/meetings/${encodeURIComponent(code)}/start`, 'POST'),
  endMeeting: (code: string) => request(`/meetings/${encodeURIComponent(code)}/end`, 'POST'),

  // Chats
  getRecentChats: () => request('/chats/recent'),
  getDirectMessages: (contactId: string, cursor?: string) => 
    request(`/chats/direct/${contactId}${cursor ? `?cursor=${cursor}` : ''}`),
  sendMessage: (body: { receiverId?: string; groupId?: string; content?: string; fileIds?: string[]; parentId?: string; voiceNoteUrl?: string; scheduledFor?: string }) =>
    request('/chats/message', 'POST', body),
  editMessage: (id: string, content: string) => request(`/chats/message/${id}`, 'PUT', { content }),
  deleteMessage: (id: string, mode?: 'FOR_ME' | 'FOR_EVERYONE') => 
    request(`/chats/message/${id}`, 'DELETE', { mode }),
  pinMessage: (id: string) => request(`/chats/message/${id}/pin`, 'POST'),
  bookmarkMessage: (id: string) => request(`/chats/message/${id}/bookmark`, 'POST'),
  getBookmarks: () => request('/chats/bookmarks'),
  createPoll: (body: { receiverId?: string; groupId?: string; question: string; options: string[]; expiresAt?: string }) => 
    request('/chats/message/poll', 'POST', body),
  votePoll: (optionId: string) => request(`/chats/message/poll/${optionId}/vote`, 'POST'),
  forwardMessage: (id: string, body: { targetReceiverIds?: string[]; targetGroupIds?: string[] }) => 
    request(`/chats/message/${id}/forward`, 'POST', body),
  addReaction: (id: string, emoji: string) => request(`/chats/message/${id}/reaction`, 'POST', { emoji }),
  removeReaction: (id: string, emoji: string) => request(`/chats/message/${id}/reaction`, 'DELETE', { emoji }),
  markAsRead: (body: { contactId?: string; groupId?: string }) => request('/chats/read', 'POST', body),
  clearChat: (body: { contactId?: string; groupId?: string }) => request('/chats/clear', 'POST', body),

  // Groups
  getGroups: () => request('/groups'),
  getGroupDetails: (id: string) => request(`/groups/${id}`),
  getGroupMessages: (groupId: string, cursor?: string) => 
    request(`/groups/${groupId}/messages${cursor ? `?cursor=${cursor}` : ''}`),
  createGroup: (body: any) => request('/groups', 'POST', body),
  updateGroup: (groupId: string, body: any) => request(`/groups/${groupId}`, 'PUT', body),
  addMember: (groupId: string, userId: string) => request(`/groups/${groupId}/member`, 'POST', { userId }),
  removeMember: (groupId: string, userId: string) => request(`/groups/${groupId}/member`, 'DELETE', { userId }),
  leaveGroup: (groupId: string) => request(`/groups/${groupId}/leave`, 'POST'),
  deleteGroup: (groupId: string) => request(`/groups/${groupId}`, 'DELETE'),

  // Tasks
  getTasks: (params: string) => request(`/tasks?${params}`),
  getTaskDetails: (id: string) => request(`/tasks/${id}`),
  createTask: (body: any) => request('/tasks', 'POST', body),
  updateTask: (id: string, body: any) => request(`/tasks/${id}`, 'PUT', body),
  deleteTask: (id: string) => request(`/tasks/${id}`, 'DELETE'),
  addTaskComment: (id: string, content: string) => request(`/tasks/${id}/comment`, 'POST', { content }),
  createSubtask: (taskId: string, title: string) => request(`/tasks/${taskId}/subtasks`, 'POST', { title }),
  toggleSubtask: (subtaskId: string) => request(`/tasks/subtasks/${subtaskId}`, 'PUT'),
  deleteSubtask: (subtaskId: string) => request(`/tasks/subtasks/${subtaskId}`, 'DELETE'),
  logTaskTime: (taskId: string, minutes: number) => request(`/tasks/${taskId}/timelogs`, 'POST', { minutes }),
  getTaskTimeLogs: (taskId: string) => request(`/tasks/${taskId}/timelogs`),
  addTaskDependency: (taskId: string, dependsOnTaskId: string) => 
    request(`/tasks/${taskId}/dependencies`, 'POST', { dependsOnTaskId }),
  removeTaskDependency: (taskId: string, dependsOnTaskId: string) => 
    request(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`, 'DELETE'),

  // Announcements
  getAnnouncements: (params: string) => request(`/announcements?${params}`),
  getAnnouncementDetails: (id: string) => request(`/announcements/${id}`),
  createAnnouncement: (body: any) => request('/announcements', 'POST', body),
  deleteAnnouncement: (id: string) => request(`/announcements/${id}`, 'DELETE'),
  likeAnnouncement: (id: string) => request(`/announcements/${id}/like`, 'POST'),
  addAnnouncementComment: (id: string, content: string) => request(`/announcements/${id}/comment`, 'POST', { content }),
  deleteAnnouncementComment: (id: string, commentId: string) => request(`/announcements/${id}/comment/${commentId}`, 'DELETE'),

  // Files
  getFiles: (params: string) => request(`/files/explorer?${params}`),
  createFolder: (name: string, parentId?: string | null) => request('/files/folder', 'POST', { name, parentId }),
  uploadFile: (formData: FormData) => request('/files/upload', 'POST', formData, true),
  updateFile: (id: string, formData: FormData) => request(`/files/${id}`, 'PUT', formData, true),
  deleteFile: (id: string) => request(`/files/${id}`, 'DELETE'),
  deleteFolder: (id: string) => request(`/files/folders/${id}`, 'DELETE'),
  getRecycleBin: () => request('/files/recycle-bin'),
  restoreItem: (id: string, type: 'FILE' | 'FOLDER') => request(`/files/${id}/restore`, 'POST', { type }),
  deletePermanently: (id: string, type: 'FILE' | 'FOLDER') => request(`/files/${id}/permanent`, 'DELETE', { type }),
  moveItem: (id: string, targetFolderId: string | null, type: 'FILE' | 'FOLDER') => 
    request(`/files/${id}/move`, 'POST', { targetFolderId, type }),
  createShareLink: (id: string, expiresHours?: number) => request(`/files/${id}/share`, 'POST', { expiresHours }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, 'PUT'),
  markAllNotificationsRead: () => request('/notifications/read-all', 'PUT'),
  deleteNotification: (id: string) => request(`/notifications/${id}`, 'DELETE'),

  // Admin Panel
  getAuditLogs: () => request('/admin/audit-logs'),
  getAdminUsers: () => request('/admin/users'),
  getSystemMetrics: () => request('/admin/system/metrics'),
  updateUserRole: (userId: string, role: string) => request(`/admin/users/${userId}/role`, 'PUT', { role }),
  toggleUserVerification: (userId: string, isVerified: boolean) => 
    request(`/admin/users/${userId}/verification`, 'PUT', { isVerified }),
  adminUpdateUser: (id: string, body: any) => request(`/admin/users/${id}`, 'PUT', body),
  adminDeleteUser: (id: string) => request(`/admin/users/${id}`, 'DELETE'),
  adminChangeUserPassword: (id: string, password: string) => request(`/admin/users/${id}/password`, 'PUT', { password }),
  getDepartmentStats: () => request('/admin/stats/departments'),
  createDepartment: (body: any) => request('/admin/departments', 'POST', body),
  getDepartments: () => request('/admin/departments'),
  deleteDepartment: (id: string) => request(`/admin/departments/${id}`, 'DELETE'),
  getProjects: () => request('/projects'),
  createProject: (body: any) => request('/projects', 'POST', body),
  updateProject: (id: string, body: any) => request(`/projects/${id}`, 'PUT', body),
  deleteProject: (id: string) => request(`/projects/${id}`, 'DELETE'),
  sendContactMessage: (body: { name: string; email: string; message: string }) => request('/auth/contact', 'POST', body),
};
