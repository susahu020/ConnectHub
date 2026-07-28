'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  FileClock, 
  ShieldAlert, 
  ShieldCheck,
  Trash2, 
  Plus, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Copy,
  Save,
  Activity,
  UserPlus,
  Mail,
  MessageSquare,
  UsersRound,
  ClipboardCheck,
  ClipboardPen,
  Megaphone,
  Video,
  FileText,
  LogOut,
  ShieldOff,
  Cake,
  HeartPulse,
  Server,
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  Send,
  Clock
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

const MODULES = ['Dashboard', 'Users', 'Groups', 'Announcements', 'Tasks', 'Files', 'Messages', 'Notifications', 'Reports', 'Admin', 'Analytics', 'Settings'];
const ACTIONS = ['Create', 'Read', 'Update', 'Delete', 'Export', 'Import', 'Approve', 'Assign', 'Archive', 'Publish'];

// Admin-controlled email notification features. `key` must match a column
// on the backend's EmailFeatureSettings model.
const EMAIL_FEATURES: { key: string; testKey: string; label: string; description: string; icon: any }[] = [
  { key: 'newMessageEmail', testKey: 'NEW_MESSAGE', label: 'New Direct Message', description: 'Email a user when they receive a new 1:1 chat message.', icon: MessageSquare },
  { key: 'groupMessageEmail', testKey: 'GROUP_MESSAGE', label: 'Group Message & Mentions', description: 'Email group members on new group messages and @mentions.', icon: UsersRound },
  { key: 'groupCreationEmail', testKey: 'GROUP_CREATION', label: 'Group Creation', description: 'Email users when they are added to a newly created group.', icon: UserPlus },
  { key: 'taskAssignedEmail', testKey: 'TASK_ASSIGNED', label: 'Task Assigned', description: 'Email the assignee when a new task is assigned to them.', icon: ClipboardCheck },
  { key: 'taskUpdatedEmail', testKey: 'TASK_UPDATED', label: 'Task Updated', description: 'Email the assignee when someone else updates their task.', icon: ClipboardPen },
  { key: 'announcementEmail', testKey: 'ANNOUNCEMENT', label: 'Announcement Posted', description: 'Email employees when a new company announcement is posted.', icon: Megaphone },
  { key: 'meetingInviteEmail', testKey: 'MEETING_INVITE', label: 'Meeting Invite', description: 'Email invitees when they are invited to a scheduled meeting.', icon: Video },
  { key: 'fileSharedEmail', testKey: 'FILE_SHARED', label: 'File / Document Shared', description: 'Email a user when a document is shared directly with them.', icon: FileText },
  { key: 'birthdayWishEmail', testKey: 'BIRTHDAY_WISH', label: 'Birthday Wish', description: 'Automatically email a user a birthday wish on their birthday.', icon: Cake },
];

function PaginationBar({ page, totalPages, total, onPageChange }: { page: number; totalPages: number; total: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 text-[10px] font-bold text-slate-400">
      <span>{total} total record{total === 1 ? '' : 's'} · Page {page} of {totalPages}</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-2.5 py-1 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="px-2.5 py-1 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'users' | 'invitations' | 'roles' | 'logs' | 'system' | 'email' | 'health'>('users');

  // Search & Filter system items
  const [userSearch, setUserSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const USERS_PAGE_SIZE = 50;
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('ALL');
  const [logsPage, setLogsPage] = useState(1);
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const LOGS_PAGE_SIZE = 50;

  // Invitation system state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [generatedLink, setGeneratedLink] = useState('');

  // Role management state
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]); // Array of { module, action, isEnabled }
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleParent, setNewRoleParent] = useState('');
  const [newRoleDuplicate, setNewRoleDuplicate] = useState('');

  // Role duplication state
  const [dupRoleOpen, setDupRoleOpen] = useState(false);
  const [dupTargetRole, setDupTargetRole] = useState<any>(null);
  const [dupNewName, setDupNewName] = useState('');
  const [dupDesc, setDupDesc] = useState('');

  // Admin User controls state
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedEditUser, setSelectedEditUser] = useState<any>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSystemRole, setEditSystemRole] = useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const [editCustomRole, setEditCustomRole] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [selectedPasswordUser, setSelectedPasswordUser] = useState<any>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');

  // Security Auth check: Redirect instantly if user role is not ADMIN
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/unauthorized');
    }
  }, [user, router]);

  // Fetch admin lists
  const { data: systemUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getAdminUsers(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: depts } = useQuery({
    queryKey: ['admin-depts'],
    queryFn: () => api.getDepartments(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.getRoles(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: auditLogsData, isLoading: loadingLogs } = useQuery({
    queryKey: ['admin-logs', logsPage, logSearch, logActionFilter, logStartDate, logEndDate],
    queryFn: () => api.getAuditLogs({
      page: logsPage,
      limit: LOGS_PAGE_SIZE,
      search: logSearch.trim() || undefined,
      action: logActionFilter !== 'ALL' ? logActionFilter : undefined,
      startDate: logStartDate || undefined,
      endDate: logEndDate || undefined,
    }),
    enabled: user?.role === 'ADMIN',
  });

  const { data: invitations, isLoading: loadingInvitations } = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: () => api.getInvitations(),
    enabled: user?.role === 'ADMIN' && activeTab === 'invitations',
  });

  const { data: health, refetch: refetchHealth, isFetching: fetchingHealth, dataUpdatedAt: healthUpdatedAt } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => api.getSystemHealth(),
    enabled: user?.role === 'ADMIN' && activeTab === 'health',
    refetchInterval: 15000,
  });

  const { data: emailFeatureSettings, isLoading: loadingEmailSettings } = useQuery({
    queryKey: ['admin-email-settings'],
    queryFn: () => api.getEmailFeatureSettings(),
    enabled: user?.role === 'ADMIN' && activeTab === 'email',
  });

  const { data: paginatedUsersData, isLoading: loadingPaginatedUsers } = useQuery({
    queryKey: ['admin-users-table', usersPage, userSearch],
    queryFn: () => api.getAdminUsers({ page: usersPage, limit: USERS_PAGE_SIZE, search: userSearch.trim() || undefined }),
    enabled: user?.role === 'ADMIN' && activeTab === 'users',
  });

  const filteredUsers = paginatedUsersData?.users || [];

  const filteredLogs = auditLogsData?.logs || [];
  const uniqueLogActions = auditLogsData?.availableActions || [];


  // User Suspension Toggle Mutation
  const toggleSuspensionMutation = useMutation({
    mutationFn: ({ id, isSuspended }: { id: string; isSuspended: boolean }) =>
      api.toggleUserSuspension(id, isSuspended),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update user status.');
    },
  });

  // Active/Inactive Toggle Mutation — distinct from suspension. This is the
  // routine account lifecycle switch (offboarding, long leave, etc.),
  // whereas Suspend is the separate, heavier-weight administrative action.
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.toggleUserActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User account status updated successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update account status.');
    },
  });

  // Force Logout Mutations — terminate a single user's active sessions, or
  // every session platform-wide (e.g. after a suspected credential leak).
  const forceLogoutUserMutation = useMutation({
    mutationFn: (targetUserId: string) => api.adminLogoutUser(targetUserId),
    onSuccess: () => {
      toast.success('User sessions terminated.');
    },
    onError: () => {
      toast.error('Failed to terminate user sessions.');
    },
  });

  const forceLogoutAllMutation = useMutation({
    mutationFn: () => api.adminLogoutAllUsers(),
    onSuccess: () => {
      toast.success('All sessions terminated platform-wide. Everyone (including you) will need to sign in again.');
    },
    onError: () => {
      toast.error('Failed to terminate sessions.');
    },
  });

  const handleForceLogoutUser = async (u: any) => {
    if (!await confirm({
      title: 'Force Logout User',
      message: `Immediately terminate all active sessions for ${u.firstName} ${u.lastName}? They will be signed out on every device and must log in again.`,
      confirmText: 'Force Logout',
      type: 'danger'
    })) return;
    forceLogoutUserMutation.mutate(u.id);
  };

  const handleForceLogoutAll = async () => {
    if (!await confirm({
      title: 'Force Logout Everyone',
      message: 'This immediately terminates every active session for every user platform-wide — including your own. Everyone will need to sign in again. This cannot be undone.',
      confirmText: 'Log Out Everyone',
      type: 'danger'
    })) return;
    forceLogoutAllMutation.mutate();
  };

  // Email Feature Toggle Mutation — flips a single feature switch and
  // optimistically updates the cache so the switch feels instant.
  const updateEmailFeatureMutation = useMutation({
    mutationFn: (updates: Record<string, boolean>) => api.updateEmailFeatureSettings(updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['admin-email-settings'] });
      const previous = queryClient.getQueryData(['admin-email-settings']);
      queryClient.setQueryData(['admin-email-settings'], (old: any) => ({ ...old, ...updates }));
      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin-email-settings'], context.previous);
      }
      toast.error('Failed to update email setting.');
    },
    onSuccess: () => {
      toast.success('Email notification setting updated.');
    },
  });

  const handleToggleEmailFeature = (key: string, currentValue: boolean) => {
    updateEmailFeatureMutation.mutate({ [key]: !currentValue });
  };

  // Send Test Email — lets the admin verify SMTP delivery on demand,
  // without needing to trigger a real business event.
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; mode: string; message: string } | null>(null);

  const sendTestEmailMutation = useMutation({
    mutationFn: (to?: string) => api.sendTestEmail(to),
    onSuccess: (data) => {
      setTestEmailResult(data);
      if (data.success) {
        toast.success('Test email sent.');
      } else {
        toast.error('Test email did not go through — see details below.');
      }
    },
    onError: (err: any) => {
      setTestEmailResult({ success: false, mode: 'error', message: err?.message || 'Request failed unexpectedly.' });
      toast.error('Failed to send test email.');
    },
  });

  const handleSendTestEmail = () => {
    setTestEmailResult(null);
    sendTestEmailMutation.mutate(testEmailTarget.trim() || undefined);
  };

  // Per-feature test send — verifies one specific email template (using the
  // same target address as the general test box above) rather than just SMTP
  // connectivity in general.
  const [featureTestResults, setFeatureTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const sendFeatureTestEmailMutation = useMutation({
    mutationFn: ({ testKey, to }: { testKey: string; to?: string }) => api.sendFeatureTestEmail(testKey, to),
    onSuccess: (data, variables) => {
      setFeatureTestResults((prev) => ({ ...prev, [variables.testKey]: { success: data.success, message: data.message } }));
      if (data.success) {
        toast.success('Sample email sent.');
      } else {
        toast.error('Sample email did not go through.');
      }
    },
    onError: (err: any, variables) => {
      const message = err?.message || 'Request failed unexpectedly.';
      setFeatureTestResults((prev) => ({ ...prev, [variables.testKey]: { success: false, message } }));
      toast.error('Failed to send sample email.');
    },
  });

  const handleSendFeatureTest = (testKey: string) => {
    sendFeatureTestEmailMutation.mutate({ testKey, to: testEmailTarget.trim() || undefined });
  };

  // User Role Update Mutation (Dynamic)
  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      api.assignUserRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User role successfully updated.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to assign role.');
    }
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: (id: string) => api.revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      toast.success('Invitation revoked.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to revoke invitation.'),
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (id: string) => api.resendInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      toast.success('Invitation resent.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to resend invitation.'),
  });

  const handleRevokeInvitation = async (inv: any) => {
    if (!await confirm({
      title: 'Revoke Invitation',
      message: `This invalidates the onboarding link sent to ${inv.email}. They won't be able to use it to join.`,
      confirmText: 'Revoke Invitation',
      type: 'danger',
    })) return;
    revokeInvitationMutation.mutate(inv.id);
  };

  const [exportingLogs, setExportingLogs] = useState(false);
  const handleExportLogs = async () => {
    setExportingLogs(true);
    try {
      await api.exportAuditLogs({
        search: logSearch.trim() || undefined,
        action: logActionFilter !== 'ALL' ? logActionFilter : undefined,
        startDate: logStartDate || undefined,
        endDate: logEndDate || undefined,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export audit logs.');
    } finally {
      setExportingLogs(false);
    }
  };

  // Custom Role Create Mutation
  const createRoleMutation = useMutation({
    mutationFn: (body: any) => api.createRole(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setCreateRoleOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleParent('');
      setNewRoleDuplicate('');
      toast.success('Custom role created.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create role.');
    },
  });

  // Custom Role Duplicate Mutation
  const duplicateRoleMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.duplicateRole(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setDupRoleOpen(false);
      setDupTargetRole(null);
      setDupNewName('');
      setDupDesc('');
      toast.success('Role duplicated successfully.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to duplicate role.');
    },
  });

  // Custom Role Delete Mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => api.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success('Role deleted.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete role.');
    },
  });

  // Save Permissions Matrix Mutation
  const savePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: any[] }) =>
      api.updateRolePermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setSelectedRole(null);
      toast.success('Permissions matrix saved.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save permissions.');
    },
  });

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    createRoleMutation.mutate({
      name: newRoleName,
      description: newRoleDesc,
      parentId: newRoleParent || null,
      duplicateFromRoleId: newRoleDuplicate || null,
    });
  };

  const handleDuplicateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dupNewName.trim() || !dupTargetRole) return;
    duplicateRoleMutation.mutate({
      id: dupTargetRole.id,
      body: { newName: dupNewName, description: dupDesc },
    });
  };

  const handleUserRoleAssign = (userId: string, roleId: string) => {
    if (!roleId) return;
    assignRoleMutation.mutate({ userId, roleId });
  };

  const handleSuspensionToggle = (userId: string, currentlySuspended: boolean) => {
    toggleSuspensionMutation.mutate({ id: userId, isSuspended: !currentlySuspended });
  };

  const handleActiveStatusChange = async (user: any, nextIsActive: boolean) => {
    if (!nextIsActive) {
      if (!await confirm({
        title: 'Deactivate Account',
        message: `Set ${user.firstName} ${user.lastName}'s account to inactive? They will be signed out everywhere and won't be able to log back in until reactivated.`,
        confirmText: 'Deactivate',
        type: 'danger',
      })) return;
    }
    toggleActiveMutation.mutate({ id: user.id, isActive: nextIsActive });
  };

  const handleDeleteRole = async (id: string) => {
    if (!await confirm({
      title: 'Delete Custom Role',
      message: 'Delete this custom role? This action cannot be undone.',
      confirmText: 'Delete Custom Role',
      type: 'danger'
    })) return;
    deleteRoleMutation.mutate(id);
  };

  const handleLoadPermissionsMatrix = async (role: any) => {
    try {
      const details = await api.getRoleDetails(role.id);
      setSelectedRole(details);
      
      const initialPerms: any[] = [];
      for (const m of MODULES) {
        for (const a of ACTIONS) {
          const matched = details.permissions?.find((p: any) => p.module === m && p.action === a);
          initialPerms.push({
            module: m,
            action: a,
            isEnabled: matched ? matched.isEnabled : false,
          });
        }
      }
      setRolePermissions(initialPerms);
    } catch (err) {
      toast.error('Failed to load permissions.');
    }
  };

  const handleToggleMatrixCheckbox = (module: string, action: string) => {
    setRolePermissions((prev) =>
      prev.map((p) =>
        p.module === module && p.action === action
          ? { ...p, isEnabled: !p.isEnabled }
          : p
      )
    );
  };

  const handleSavePermissions = () => {
    if (!selectedRole) return;
    savePermissionsMutation.mutate({
      id: selectedRole.id,
      permissions: rolePermissions,
    });
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditUser) return;
    try {
      await api.adminUpdateUser(selectedEditUser.id, {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        designation: editDesignation,
        location: editLocation,
        role: editSystemRole,
        customRoleId: editCustomRole || null,
        managerId: editManagerId || null,
        departmentId: editDepartmentId || null,
        joiningDate: editJoiningDate || null
      });
      toast.success('User details updated successfully.');
      setEditUserOpen(false);
      setSelectedEditUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user.');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (userId === user?.id) {
      toast.error('You cannot delete your own account.');
      return;
    }
    if (!await confirm({
      title: 'Delete User Account',
      message: `Are you sure you want to delete user ${email}? This action is permanent.`,
      confirmText: 'Delete User',
      type: 'danger'
    })) {
      return;
    }
    try {
      await api.adminDeleteUser(userId);
      toast.success('User deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user.');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPasswordUser) return;
    const classCount = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(adminNewPassword)).length;
    if (adminNewPassword.length < 8 || classCount < 3) {
      toast.error('Password must be at least 8 characters with at least 3 of: uppercase, lowercase, numbers, symbols.');
      return;
    }
    try {
      await api.adminChangeUserPassword(selectedPasswordUser.id, adminNewPassword);
      toast.success('User password changed successfully.');
      setChangePasswordOpen(false);
      setSelectedPasswordUser(null);
      setAdminNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change user password.');
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error('Email is required.');
      return;
    }
    try {
      const res = await api.inviteUser({ email: inviteEmail, role: inviteRole });
      toast.success('Onboarding invitation email sent successfully!');
      setGeneratedLink(res.inviteLink);
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send onboarding invitation.');
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Administrative Console</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Control employee roles, monitor systems, and audit security events.</p>
        </div>

        {activeTab === 'roles' && (
          <button
            onClick={() => setCreateRoleOpen(true)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Role</span>
          </button>
        )}

        {(activeTab === 'users' || activeTab === 'invitations') && (
          <button
            onClick={() => {
              setGeneratedLink('');
              setInviteEmail('');
              setInviteModalOpen(true);
            }}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Teammate</span>
          </button>
        )}

        {activeTab === 'users' && (
          <button
            onClick={handleForceLogoutAll}
            className="px-4 py-2.5 border border-red-200 dark:border-red-950 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-all flex items-center space-x-1.5"
            title="Terminate every active session for every user"
          >
            <ShieldOff className="h-4 w-4" />
            <span>Force Logout Everyone</span>
          </button>
        )}
      </div>

      {/* Tabs panels switcher */}
      <div className="flex border-b text-xs font-bold text-slate-400">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition-all leading-none ${
            activeTab === 'users' ? 'border-primary text-primary font-black' : 'border-transparent hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Management</span>
        </button>

        <button
          onClick={() => setActiveTab('invitations')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition-all leading-none ${
            activeTab === 'invitations' ? 'border-primary text-primary font-black' : 'border-transparent hover:text-foreground'
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Invitations</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition-all leading-none ${
            activeTab === 'roles' ? 'border-primary text-primary font-black' : 'border-transparent hover:text-foreground'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Role Management</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition-all leading-none ${
            activeTab === 'logs' ? 'border-primary text-primary font-black' : 'border-transparent hover:text-foreground'
          }`}
        >
          <FileClock className="h-4 w-4" />
          <span>Audit Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition-all leading-none ${
            activeTab === 'health' ? 'border-primary text-primary font-black' : 'border-transparent hover:text-foreground'
          }`}
        >
          <HeartPulse className="h-4 w-4" />
          <span>System Health</span>
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition-all leading-none ${
            activeTab === 'email' ? 'border-primary text-primary font-black' : 'border-transparent hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>Email Notifications</span>
        </button>

      </div>

      {/* Tab Workspaces */}
      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm overflow-x-auto min-h-[400px]">
        {/* User Management Workspace */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* User Search Input */}
            <div className="relative max-w-sm">
              <input
                type="text"
                placeholder="Search employees by name, email, or designation..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); }}
                className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold"
              />
              {/* Search Magnifier SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.603 10.603z" />
              </svg>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-slate-400 uppercase text-[9px] tracking-wider font-bold">
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Designation</th>
                  <th className="pb-3">Assigned Custom Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold text-slate-650 dark:text-slate-350">
                {loadingPaginatedUsers || loadingRoles ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">Loading user database...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 italic">No matching users found in the database.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-3.5 flex items-center space-x-2">
                        <div className="h-7 w-7 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-[10px] text-slate-500 uppercase">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span>{u.firstName} {u.lastName}</span>
                      </td>
                      <td className="py-3.5">{u.email}</td>
                      <td className="py-3.5">{u.designation || 'Engineer'}</td>
                      <td className="py-3.5">
                        <select
                          value={u.customRoleId || ''}
                          onChange={(e) => handleUserRoleAssign(u.id, e.target.value)}
                          className="bg-transparent border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px] focus:outline-none"
                        >
                          <option value="">-- No custom role --</option>
                          {roles?.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={u.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                            onChange={(e) => handleActiveStatusChange(u, e.target.value === 'ACTIVE')}
                            disabled={u.id === user?.id}
                            title={u.id === user?.id ? "You can't deactivate your own account." : undefined}
                            className={`px-2 py-1 rounded-lg text-[9px] uppercase font-extrabold border focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                              u.isActive === false
                                ? 'bg-red-500/10 text-red-500 border-red-200 dark:border-red-950'
                                : 'bg-green-500/10 text-green-500 border-green-200 dark:border-green-950'
                            }`}
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                          </select>
                          {u.isSuspended && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] uppercase font-extrabold bg-amber-500/10 text-amber-600 whitespace-nowrap"
                              title="Also suspended — suspension independently blocks login regardless of this setting."
                            >
                              Suspended
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-right space-x-1.5">
                        {/* Edit User Button */}
                        <button
                          onClick={() => {
                            setSelectedEditUser(u);
                            setEditFirstName(u.firstName);
                            setEditLastName(u.lastName);
                            setEditEmail(u.email);
                            setEditDesignation(u.designation || '');
                            setEditLocation(u.location || '');
                            setEditSystemRole(u.role);
                            setEditCustomRole(u.customRoleId || '');
                            setEditManagerId(u.managerId || '');
                            setEditDepartmentId(u.departmentId || '');
                            setEditJoiningDate(u.joiningDate ? String(u.joiningDate).split('T')[0] : '');
                            setEditUserOpen(true);
                          }}
                          className="text-[10px] font-bold px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-650 dark:text-slate-300"
                          id={`edit-user-btn-${u.id}`}
                        >
                          Edit
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => {
                            setSelectedPasswordUser(u);
                            setAdminNewPassword('');
                            setChangePasswordOpen(true);
                          }}
                          className="text-[10px] font-bold px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-650 dark:text-slate-300"
                          id={`password-user-btn-${u.id}`}
                        >
                          Password
                        </button>

                        {/* Suspend/Unsuspend Button */}
                        <button
                          onClick={() => handleSuspensionToggle(u.id, u.isSuspended)}
                          disabled={u.id === user?.id}
                          title={u.id === user?.id ? "You can't suspend your own account." : undefined}
                          className={`text-[10px] font-bold px-2.5 py-1 border rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.isSuspended
                              ? 'text-green-500 border-green-200 dark:border-green-955 hover:bg-green-55/20'
                              : 'text-amber-500 border-amber-200 dark:border-amber-955 hover:bg-amber-50 dark:hover:bg-amber-955/20'
                          }`}
                          id={`verify-user-btn-${u.id}`}
                        >
                          {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </button>

                        {/* Force Logout Button */}
                        <button
                          onClick={() => handleForceLogoutUser(u)}
                          className="text-[10px] font-bold px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-650 dark:text-slate-300"
                          id={`force-logout-btn-${u.id}`}
                          title="Terminate all active sessions for this user"
                        >
                          Force Logout
                        </button>

                        {/* Delete User Button */}
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-955 inline-flex items-center justify-center align-middle"
                            title="Delete User Account"
                            type="button"
                            id={`delete-user-btn-${u.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <PaginationBar
              page={paginatedUsersData?.page || 1}
              totalPages={paginatedUsersData?.totalPages || 1}
              total={paginatedUsersData?.total || filteredUsers.length}
              onPageChange={setUsersPage}
            />
          </div>
        )}

        {/* Invitations Workspace */}
        {activeTab === 'invitations' && (
          <div className="text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-slate-400 uppercase text-[9px] tracking-wider font-bold">
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Invited By</th>
                  <th className="pb-3">Expires</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold text-slate-600 dark:text-slate-350">
                {loadingInvitations ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading invitations...
                    </td>
                  </tr>
                ) : invitations?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No invitations sent yet. Use "Invite Teammate" to bring someone onboard.
                    </td>
                  </tr>
                ) : (
                  invitations?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-3.5 font-bold text-primary">{inv.email}</td>
                      <td className="py-3.5">{inv.role}</td>
                      <td className="py-3.5">
                        <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black border uppercase ${
                          inv.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : inv.status === 'ACCEPTED'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-slate-400/10 text-slate-400 border-slate-400/20'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-400">
                        {inv.invitedBy ? `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}` : 'Unknown'}
                      </td>
                      <td className="py-3.5 text-slate-400">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right space-x-1">
                        {inv.status !== 'ACCEPTED' && (
                          <>
                            <button
                              onClick={() => resendInvitationMutation.mutate(inv.id)}
                              disabled={resendInvitationMutation.isPending}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded disabled:opacity-40"
                              title="Resend invitation"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRevokeInvitation(inv)}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded"
                              title="Revoke invitation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Custom Role Management Workspace */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-slate-400 uppercase text-[9px] tracking-wider font-bold">
                  <th className="pb-3">Role Name</th>
                  <th className="pb-3">Inherits From</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Active Users</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold text-slate-600 dark:text-slate-350">
                {loadingRoles ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">Loading custom roles matrix...</td>
                  </tr>
                ) : roles?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">No custom roles created.</td>
                  </tr>
                ) : (
                  roles?.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-3.5 font-bold text-primary flex items-center space-x-1.5">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span>{r.name}</span>
                      </td>
                      <td className="py-3.5">
                        {r.parent ? (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] text-slate-400">
                            {r.parent.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 text-slate-400">{r.description || 'No description provided.'}</td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px]">
                          {r._count?.users || 0} user(s)
                        </span>
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleLoadPermissionsMatrix(r)}
                          className="px-2.5 py-1 text-[10px] font-bold border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          Permission Matrix
                        </button>
                        <button
                          onClick={() => {
                            setDupTargetRole(r);
                            setDupNewName(`${r.name} Copy`);
                            setDupRoleOpen(true);
                          }}
                          className="p-1.5 border hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg inline-flex text-slate-500"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(r.id)}
                          disabled={r._count?.users > 0}
                          className="p-1.5 border border-red-200 dark:border-red-950 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg inline-flex disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Permission Matrix Editor Panel */}
            {selectedRole && (
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base">Permissions Matrix for: <span className="text-primary">{selectedRole.name}</span></h3>
                    <p className="text-xs text-slate-400">Configure enabled modules and actions. Parent role fallback values are loaded automatically.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedRole(null)}
                      className="px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={savePermissionsMutation.isPending}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Matrix</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b text-slate-400 uppercase text-[9px] tracking-wider font-bold bg-slate-100 dark:bg-slate-800">
                        <th className="p-3">Module</th>
                        {ACTIONS.map((action) => (
                          <th key={action} className="p-3 text-center">{action}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y font-semibold">
                      {MODULES.map((module) => (
                        <tr key={module} className="hover:bg-slate-100/30 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{module}</td>
                          {ACTIONS.map((action) => {
                            const matched = rolePermissions.find((p) => p.module === module && p.action === action);
                            const isEnabled = matched ? matched.isEnabled : false;
                            return (
                              <td key={action} className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => handleToggleMatrixCheckbox(module, action)}
                                  className="rounded text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Logs Workspace */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Audit Logs Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50/50 dark:bg-slate-800/10 border rounded-2xl text-xs font-bold text-slate-500">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 flex-wrap">
                {/* Search input */}
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="Search logs by user email or description..."
                    value={logSearch}
                    onChange={(e) => { setLogSearch(e.target.value); setLogsPage(1); }}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold"
                  />
                  {/* Search Magnifier SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.603 10.603z" />
                  </svg>
                </div>

                {/* Action filter dropdown */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-400 uppercase">Action Filter:</span>
                  <select
                    value={logActionFilter}
                    onChange={(e) => { setLogActionFilter(e.target.value); setLogsPage(1); }}
                    className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-xs cursor-pointer max-w-[200px] truncate focus:outline-none"
                  >
                    <option value="ALL">All Actions</option>
                    {uniqueLogActions.map((action) => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>

                {/* Date range filter */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-400 uppercase">From:</span>
                  <input
                    type="date"
                    value={logStartDate}
                    onChange={(e) => { setLogStartDate(e.target.value); setLogsPage(1); }}
                    className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 uppercase">To:</span>
                  <input
                    type="date"
                    value={logEndDate}
                    onChange={(e) => { setLogEndDate(e.target.value); setLogsPage(1); }}
                    className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Reset filter action */}
                {(logSearch || logActionFilter !== 'ALL' || logStartDate || logEndDate) && (
                  <button
                    onClick={() => {
                      setLogSearch('');
                      setLogActionFilter('ALL');
                      setLogStartDate('');
                      setLogEndDate('');
                      setLogsPage(1);
                    }}
                    className="px-3 py-1.5 text-slate-550 hover:text-slate-800 text-xs transition-all font-semibold"
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={handleExportLogs}
                  disabled={exportingLogs}
                  className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  title="Export the currently filtered logs to CSV (up to 20,000 rows)"
                >
                  <Send className="h-3.5 w-3.5" />
                  {exportingLogs ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-slate-400 uppercase text-[9px] tracking-wider font-bold">
                  <th className="pb-3">Action Date</th>
                  <th className="pb-3">User Profile</th>
                  <th className="pb-3">Action Taken</th>
                  <th className="pb-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold text-slate-650 dark:text-slate-350">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400">Loading security audit trail...</td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 italic">No matching audit logs found.</td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-[11px]">
                      <td className="py-3 text-slate-450">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-3">{log.user?.email || 'SYSTEM'}</td>
                      <td className="py-3 font-bold text-primary">{log.action}</td>
                      <td className="py-3 text-slate-500 leading-normal text-left">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <PaginationBar
              page={auditLogsData?.page || 1}
              totalPages={auditLogsData?.totalPages || 1}
              total={auditLogsData?.total || filteredLogs.length}
              onPageChange={setLogsPage}
            />
          </div>
        )}

        {/* System Health Workspace */}
        {activeTab === 'health' && (
          <div className="space-y-6 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">System Health</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {healthUpdatedAt ? `Last checked ${new Date(healthUpdatedAt).toLocaleTimeString()} · auto-refreshes every 15s.` : 'Checking...'}
                </p>
              </div>
              <button
                onClick={() => refetchHealth()}
                disabled={fetchingHealth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${fetchingHealth ? 'animate-spin' : ''}`} />
                Refresh Now
              </button>
            </div>

            {!health ? (
              <div className="flex items-center justify-center py-20 text-slate-450">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                <span>Running health checks...</span>
              </div>
            ) : (
              <>
                {/* Overall status banner */}
                {(() => {
                  const statusStyles: Record<string, string> = {
                    healthy: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                    degraded: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                    down: 'bg-red-500/10 text-red-600 border-red-500/20',
                  };
                  const statusLabel: Record<string, string> = {
                    healthy: 'All Systems Operational',
                    degraded: 'Degraded — Some Issues Detected',
                    down: 'Critical — Immediate Attention Needed',
                  };
                  return (
                    <div className={`flex items-center gap-3 border rounded-2xl px-5 py-4 ${statusStyles[health.status]}`}>
                      <HeartPulse className="h-6 w-6 shrink-0" />
                      <div>
                        <p className="font-black text-sm">{statusLabel[health.status]}</p>
                        <p className="text-[10px] opacity-80 mt-0.5">
                          Uptime: {Math.floor(health.uptimeSeconds / 3600)}h {Math.floor((health.uptimeSeconds % 3600) / 60)}m · Node {health.nodeVersion}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Total Users', value: health.quickStats?.totalUsers },
                    { label: 'Active Today', value: health.quickStats?.activeToday },
                    { label: 'Open Tasks', value: health.quickStats?.openTasks },
                    { label: 'Pending Leave', value: health.quickStats?.pendingLeaveRequests },
                    { label: 'Pending Expenses', value: health.quickStats?.pendingExpenseClaims },
                  ].map((stat) => (
                    <div key={stat.label} className="border rounded-2xl p-3.5 bg-slate-50/40 dark:bg-slate-800/30 text-center">
                      <p className="text-lg font-black text-foreground">{stat.value ?? '—'}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Individual feature/dependency checks */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'database', label: 'Database (PostgreSQL)', icon: Database },
                    { key: 'redis', label: 'Redis Cache / Queue', icon: Server },
                    { key: 'email', label: 'Email (SMTP)', icon: Mail },
                    { key: 'storage', label: 'File Storage', icon: HardDrive },
                    { key: 'realtime', label: 'Realtime (Socket.io)', icon: Activity },
                    { key: 'memory', label: 'Memory & Resources', icon: Cpu },
                  ].map(({ key, label, icon: Icon }) => {
                    const check = health.checks?.[key];
                    if (!check) return null;
                    const dotColor = check.status === 'healthy' ? 'bg-emerald-500' : check.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500';
                    const textColor = check.status === 'healthy' ? 'text-emerald-600' : check.status === 'degraded' ? 'text-amber-600' : 'text-red-600';
                    return (
                      <div key={key} className="border rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-bold text-xs">{label}</span>
                          </div>
                          <span className={`flex items-center gap-1 text-[9px] font-black uppercase ${textColor}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                            {check.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">{check.message}</p>
                        {typeof check.latencyMs === 'number' && (
                          <p className="text-[9px] text-slate-400 font-bold">Latency: {check.latencyMs}ms</p>
                        )}
                        {key === 'memory' && (
                          <p className="text-[9px] text-slate-400 font-bold">
                            Heap: {check.heapUsedMB}/{check.heapTotalMB}MB · System: {check.systemUsedPercent}% used
                            {typeof check.cpuUsageSeconds === 'number' && <> · CPU time: {check.cpuUsageSeconds}s</>}
                          </p>
                        )}
                        {key === 'database' && typeof check.activeConnections === 'number' && (
                          <p className="text-[9px] text-slate-400 font-bold">{check.activeConnections} active connection(s)</p>
                        )}
                        {key === 'redis' && typeof check.keysCount === 'number' && (
                          <p className="text-[9px] text-slate-400 font-bold">{check.keysCount} cached key(s)</p>
                        )}
                        {key === 'realtime' && typeof check.connectedClients === 'number' && (
                          <p className="text-[9px] text-slate-400 font-bold">{check.connectedClients} client(s) connected</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Background jobs */}
                <div className="border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-slate-50/60 dark:bg-slate-800/40 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-bold text-xs">Background Jobs</span>
                  </div>
                  <table className="w-full text-[10px]">
                    <thead className="bg-slate-50/40 dark:bg-slate-800/20 text-slate-400 uppercase text-[9px]">
                      <tr>
                        <th className="text-left px-4 py-2 font-bold">Job</th>
                        <th className="text-left px-4 py-2 font-bold">Last Run</th>
                        <th className="text-left px-4 py-2 font-bold">Result</th>
                        <th className="text-left px-4 py-2 font-bold">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(health.checks?.backgroundJobs?.jobs || []).map((job: any) => (
                        <tr key={job.name}>
                          <td className="px-4 py-2 font-bold">{job.name}</td>
                          <td className="px-4 py-2 text-slate-400">{job.lastRunAt ? new Date(job.lastRunAt).toLocaleTimeString() : 'Never run yet'}</td>
                          <td className="px-4 py-2">
                            {job.lastSuccess === null ? (
                              <span className="text-slate-400">—</span>
                            ) : job.lastSuccess ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {job.lastResultSummary || 'OK'}</span>
                            ) : (
                              <span className="text-red-600 font-bold flex items-center gap-1"><XCircle className="h-3 w-3" /> {job.lastError || 'Failed'}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-slate-400">{job.lastDurationMs != null ? `${job.lastDurationMs}ms` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Recent errors */}
                <div className="border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-bold text-xs">Recent Errors</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold">
                      {health.checks?.errors?.errorsLast5Min ?? 0} in last 5 min · {health.checks?.errors?.totalErrors ?? 0} total this session
                    </span>
                  </div>
                  {(health.checks?.errors?.recentErrors || []).length === 0 ? (
                    <p className="px-4 py-8 text-center text-slate-400">No recent errors. 🎉</p>
                  ) : (
                    <div className="divide-y max-h-64 overflow-y-auto">
                      {health.checks.errors.recentErrors.map((err: any, i: number) => (
                        <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                          <span className="text-[9px] font-black text-red-500 shrink-0 mt-0.5">{err.statusCode}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{err.method} {err.path}</p>
                            <p className="text-slate-400 truncate">{err.message}</p>
                          </div>
                          <span className="text-[9px] text-slate-400 shrink-0 ml-auto">{new Date(err.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Email Notifications Workspace */}
        {activeTab === 'email' && (
          <div className="space-y-6 animate-in fade-in duration-200 text-xs">
            <div className="border-b pb-3">
              <h3 className="font-bold text-sm text-foreground">Email Notification Features</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Control which events trigger outbound emails, platform-wide. When a feature is off here, no email is sent
                for it regardless of any individual user's personal notification preferences.
              </p>
            </div>

            {/* Send Test Email */}
            <div className="border rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                <Mail className="h-3.5 w-3.5" />
                <span>Send Test Email</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Send a real email right now through the current SMTP configuration to verify delivery is working —
                no need to wait for a real notification to trigger.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={testEmailTarget}
                  onChange={(e) => setTestEmailTarget(e.target.value)}
                  placeholder={user?.email || 'you@example.com'}
                  className="flex-1 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                />
                <button
                  onClick={handleSendTestEmail}
                  disabled={sendTestEmailMutation.isPending}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
                >
                  {sendTestEmailMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  <span>Send Test Email</span>
                </button>
              </div>
              <p className="text-[9px] text-slate-400">Leave blank to send to your own account email ({user?.email}).</p>

              {testEmailResult && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-xl text-[10px] font-semibold ${
                    testEmailResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
                      : testEmailResult.mode === 'not-configured'
                      ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'
                      : 'bg-red-50 dark:bg-red-950/20 text-red-600'
                  }`}
                >
                  {testEmailResult.success ? (
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : testEmailResult.mode === 'not-configured' ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{testEmailResult.message}</span>
                </div>
              )}
            </div>

            {loadingEmailSettings ? (
              <div className="flex items-center justify-center py-20 text-slate-450">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                <span>Loading email feature settings...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {EMAIL_FEATURES.map(({ key, testKey, label, description, icon: Icon }) => {
                  const isEnabled = emailFeatureSettings ? !!emailFeatureSettings[key] : true;
                  const isTesting = sendFeatureTestEmailMutation.isPending && sendFeatureTestEmailMutation.variables?.testKey === testKey;
                  const testResult = featureTestResults[testKey];
                  return (
                    <div
                      key={key}
                      className="border rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-foreground">{label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{description}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isEnabled}
                          onClick={() => handleToggleEmailFeature(key, isEnabled)}
                          disabled={updateEmailFeatureMutation.isPending}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                            isEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3 pl-11">
                        <button
                          type="button"
                          onClick={() => handleSendFeatureTest(testKey)}
                          disabled={isTesting}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          {isTesting ? 'Sending sample...' : 'Send Test'}
                        </button>
                        {testResult && (
                          <p className={`text-[10px] flex items-center gap-1 ${testResult.success ? 'text-emerald-600' : 'text-red-500'}`}>
                            {testResult.success ? <CheckCircle className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
                            <span className="truncate max-w-[220px]" title={testResult.message}>{testResult.message}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Custom Role Modal */}
      {createRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setCreateRoleOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Create Custom Role</h3>
              <p className="text-xs text-slate-400">Establish dynamic permission profiles with inheritance support.</p>
            </div>
            <form onSubmit={handleCreateRoleSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HR Administrator"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Description</label>
                <textarea
                  placeholder="Permissions and target scope details..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[10px]">Inherit Permissions From</label>
                  <select
                    value={newRoleParent}
                    onChange={(e) => setNewRoleParent(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="">-- None --</option>
                    {roles?.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[10px]">Duplicate Matrix From</label>
                  <select
                    value={newRoleDuplicate}
                    onChange={(e) => setNewRoleDuplicate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="">-- None --</option>
                    {roles?.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                Create Role
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Role Modal */}
      {dupRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => { setDupRoleOpen(false); setDupTargetRole(null); }} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Duplicate Custom Role</h3>
              <p className="text-xs text-slate-400">Clone the entire permissions matrix into a new custom role profile.</p>
            </div>
            <form onSubmit={handleDuplicateSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">New Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Developer"
                  value={dupNewName}
                  onChange={(e) => setDupNewName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Description</label>
                <textarea
                  placeholder="Cloned scope details..."
                  value={dupDesc}
                  onChange={(e) => setDupDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                Clone Role
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invite Teammate Onboarding Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button 
              onClick={() => { setInviteModalOpen(false); setGeneratedLink(''); }} 
              className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg"
              id="close-invite-modal-btn"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center space-x-1.5 text-slate-900 dark:text-slate-100">
                <UserPlus className="h-5 w-5 text-primary" />
                <span>Invite New Teammate</span>
              </h3>
              <p className="text-xs text-muted-foreground">Send a secure onboarding link directly to their email.</p>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[10px]">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  id="invite-email-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[10px]">Assign System Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  id="invite-role-select"
                >
                  <option value="EMPLOYEE">Employee (Base Teammate)</option>
                  <option value="MANAGER">Manager (Department Lead)</option>
                  <option value="ADMIN">Admin (Executive Console)</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary/95 transition-all"
                id="submit-invite-btn"
              >
                Send Onboarding Link
              </button>
            </form>

            {generatedLink && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 border rounded-xl space-y-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Teammate Onboarding Link:</span>
                <div className="flex items-center justify-between space-x-2 bg-white dark:bg-slate-900 border rounded-lg p-2 overflow-hidden">
                  <span className="truncate select-all text-slate-650 dark:text-slate-350 pr-2 select-all font-mono text-[10px] flex-1">
                    {generatedLink}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast.success('Link copied to clipboard!');
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 shrink-0"
                    title="Copy onboarding link"
                    type="button"
                    id="copy-invite-link-btn"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">Share this registration URL with the invitee. This link will bypass the public registry gates and initialize their allocated roles.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Details Modal */}
      {editUserOpen && selectedEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button 
              onClick={() => { setEditUserOpen(false); setSelectedEditUser(null); }} 
              className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg"
              id="close-edit-user-modal-btn"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Edit Teammate Profile</h3>
              <p className="text-xs text-muted-foreground">Modify details for {selectedEditUser.email}</p>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[10px]">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                    id="edit-firstname-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[10px]">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                    id="edit-lastname-input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[10px]">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  id="edit-email-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[10px]">Designation</label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                    id="edit-designation-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[10px]">Office Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                    id="edit-location-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[10px]">System Access Role</label>
                  <select
                    value={editSystemRole}
                    onChange={(e) => setEditSystemRole(e.target.value as any)}
                    disabled={selectedEditUser?.id === user?.id}
                    title={selectedEditUser?.id === user?.id ? "You can't change your own system access role." : undefined}
                    className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    id="edit-system-role-select"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[10px]">Custom RBAC Role</label>
                  <select
                    value={editCustomRole}
                    onChange={(e) => setEditCustomRole(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs"
                    id="edit-custom-role-select"
                  >
                    <option value="">-- No custom role --</option>
                    {roles?.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[10px]">Reporting Manager</label>
                  <select
                    value={editManagerId}
                    onChange={(e) => setEditManagerId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs"
                    id="edit-manager-select"
                  >
                    <option value="">No Manager Assigned</option>
                    {systemUsers?.filter((u: any) => u.id !== selectedEditUser?.id).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.designation || 'Staff'})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[10px]">Department</label>
                  <select
                    value={editDepartmentId}
                    onChange={(e) => setEditDepartmentId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs"
                    id="edit-department-select"
                  >
                    <option value="">No Department</option>
                    {depts?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[10px]">Joining Date</label>
                <input
                  type="date"
                  value={editJoiningDate}
                  onChange={(e) => setEditJoiningDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs"
                  id="edit-joining-date-input"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary/95 transition-all mt-2"
                id="submit-edit-user-btn"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Force Change Password Modal */}
      {changePasswordOpen && selectedPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative">
            <button 
              onClick={() => { setChangePasswordOpen(false); setSelectedPasswordUser(null); }} 
              className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg"
              id="close-password-modal-btn"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Reset User Password</h3>
              <p className="text-xs text-muted-foreground">Force update password credentials for {selectedPasswordUser.firstName} {selectedPasswordUser.lastName}</p>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[10px]">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  id="admin-new-password-input"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary/95 transition-all"
                id="submit-password-btn"
              >
                Confirm Reset Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
