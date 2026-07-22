'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Building2, 
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
  Palette,
  Globe,
  MapPin,
  Image as ImageIcon,
  LogOut,
  ShieldOff,
  Upload
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

const MODULES = ['Dashboard', 'Users', 'Groups', 'Announcements', 'Tasks', 'Files', 'Messages', 'Notifications', 'Reports', 'Admin', 'Analytics', 'Settings'];
const ACTIONS = ['Create', 'Read', 'Update', 'Delete', 'Export', 'Import', 'Approve', 'Assign', 'Archive', 'Publish'];

// Admin-controlled email notification features. `key` must match a column
// on the backend's EmailFeatureSettings model.
// Common IANA timezones for the org-wide default timezone selector. Not
// exhaustive (there are ~400 IANA zones) — covers the zones a typical
// distributed org's HQ/primary offices are likely to be in.
const COMMON_TIMEZONES: string[] = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Perth',
  'Pacific/Auckland',
];

const EMAIL_FEATURES: { key: string; label: string; description: string; icon: any }[] = [
  { key: 'newMessageEmail', label: 'New Direct Message', description: 'Email a user when they receive a new 1:1 chat message.', icon: MessageSquare },
  { key: 'groupMessageEmail', label: 'Group Message & Mentions', description: 'Email group members on new group messages and @mentions.', icon: UsersRound },
  { key: 'groupCreationEmail', label: 'Group Creation', description: 'Email users when they are added to a newly created group.', icon: UserPlus },
  { key: 'taskAssignedEmail', label: 'Task Assigned', description: 'Email the assignee when a new task is assigned to them.', icon: ClipboardCheck },
  { key: 'taskUpdatedEmail', label: 'Task Updated', description: 'Email the assignee when someone else updates their task.', icon: ClipboardPen },
  { key: 'announcementEmail', label: 'Announcement Posted', description: 'Email employees when a new company announcement is posted.', icon: Megaphone },
  { key: 'meetingInviteEmail', label: 'Meeting Invite', description: 'Email invitees when they are invited to a scheduled meeting.', icon: Video },
  { key: 'fileSharedEmail', label: 'File / Document Shared', description: 'Email a user when a document is shared directly with them.', icon: FileText },
];

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'roles' | 'logs' | 'system' | 'email' | 'org' | 'teams'>('users');

  // Search & Filter system items
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('ALL');

  // Invitation system state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [generatedLink, setGeneratedLink] = useState('');

  // Department creation state
  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Team creation & roster management state
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamDeptId, setTeamDeptId] = useState('');
  const [manageTeamRosterId, setManageTeamRosterId] = useState<string | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState('');

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
  const { data: systemUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getAdminUsers(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: depts, isLoading: loadingDepts } = useQuery({
    queryKey: ['admin-depts'],
    queryFn: () => api.getDepartments(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => api.getTeams(),
    enabled: user?.role === 'ADMIN' && activeTab === 'teams',
  });

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.getRoles(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: auditLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => api.getAuditLogs(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => api.getSystemMetrics(),
    enabled: user?.role === 'ADMIN' && activeTab === 'system',
    refetchInterval: 5000,
  });

  const { data: emailFeatureSettings, isLoading: loadingEmailSettings } = useQuery({
    queryKey: ['admin-email-settings'],
    queryFn: () => api.getEmailFeatureSettings(),
    enabled: user?.role === 'ADMIN' && activeTab === 'email',
  });

  const { data: orgSettingsData, isLoading: loadingOrgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: () => api.getOrganizationSettings(),
    enabled: user?.role === 'ADMIN' && activeTab === 'org',
  });

  const filteredUsers = systemUsers?.filter((u: any) => {
    const matchesSearch = !userSearch.trim() ||
                          u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                          (u.designation && u.designation.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesSearch;
  }) || [];

  const filteredLogs = auditLogs?.filter((log: any) => {
    const matchesSearch = !logSearch.trim() ||
                          log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
                          (log.user?.email && log.user.email.toLowerCase().includes(logSearch.toLowerCase()));
    const matchesAction = logActionFilter === 'ALL' || log.action === logActionFilter;
    return matchesSearch && matchesAction;
  }) || [];

  const uniqueLogActions = Array.from(new Set(auditLogs?.map((log: any) => log.action).filter(Boolean))) as string[];

  // User Verification Toggle Mutation
  const toggleVerifyMutation = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      api.toggleUserVerification(id, isVerified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated successfully.');
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

  // Organization Settings — local editable form state, synced from the
  // fetched row whenever it (re)loads.
  const [orgForm, setOrgForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (orgSettingsData) {
      setOrgForm({
        orgName: orgSettingsData.orgName || '',
        tagline: orgSettingsData.tagline || '',
        logoUrl: orgSettingsData.logoUrl || '',
        faviconUrl: orgSettingsData.faviconUrl || '',
        primaryColor: orgSettingsData.primaryColor || '#4f46e5',
        supportEmail: orgSettingsData.supportEmail || '',
        website: orgSettingsData.website || '',
        address: orgSettingsData.address || '',
        defaultWatermarkText: orgSettingsData.defaultWatermarkText || '',
        defaultTimezone: orgSettingsData.defaultTimezone || '',
      });
    }
  }, [orgSettingsData]);

  const updateOrgSettingsMutation = useMutation({
    mutationFn: (updates: Record<string, string | null>) => api.updateOrganizationSettings(updates),
    onSuccess: (data) => {
      // Keep the admin form's own cache entry in sync, and also update the
      // shared ['organization-settings'] key that every page in the app
      // reads from via useOrganizationSettings — so the change is reflected
      // everywhere (sidebar, auth pages, emails, landing page) right away.
      queryClient.setQueryData(['organization-settings'], data);
      toast.success('Organization settings updated.');
    },
    onError: () => {
      toast.error('Failed to update organization settings.');
    },
  });

  const handleSaveOrgSettings = () => {
    updateOrgSettingsMutation.mutate(orgForm);
  };

  // Logo/Favicon — uploaded immediately on file selection (not deferred to
  // the Save button), matching how avatar uploads work elsewhere in the
  // app. Updates the shared cache right away so the new image shows up
  // everywhere (sidebar, auth pages, landing page) without a page reload.
  const uploadLogoMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadOrganizationLogo(formData),
    onSuccess: (data) => {
      queryClient.setQueryData(['organization-settings'], data);
      setOrgForm((prev) => ({ ...prev, logoUrl: data.logoUrl || '' }));
      toast.success('Logo uploaded successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Logo upload failed.'),
  });

  const uploadFaviconMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadOrganizationFavicon(formData),
    onSuccess: (data) => {
      queryClient.setQueryData(['organization-settings'], data);
      setOrgForm((prev) => ({ ...prev, faviconUrl: data.faviconUrl || '' }));
      toast.success('Favicon uploaded successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Favicon upload failed.'),
  });

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    uploadLogoMutation.mutate(formData);
    e.target.value = '';
  };

  const handleFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('favicon', file);
    uploadFaviconMutation.mutate(formData);
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    updateOrgSettingsMutation.mutate({ logoUrl: null });
    setOrgForm((prev) => ({ ...prev, logoUrl: '' }));
  };

  const handleRemoveFavicon = () => {
    updateOrgSettingsMutation.mutate({ faviconUrl: null });
    setOrgForm((prev) => ({ ...prev, faviconUrl: '' }));
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

  // Department Create Mutation
  const createDeptMutation = useMutation({
    mutationFn: (body: any) => api.createDepartment(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
      setCreateDeptOpen(false);
      setDeptName('');
      setDeptDesc('');
      toast.success('Department created successfully.');
    },
  });

  // Department Delete Mutation
  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => api.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
      toast.success('Department deleted.');
    },
  });

  // Team Create Mutation
  const createTeamMutation = useMutation({
    mutationFn: (body: { name: string; description?: string; departmentId: string }) => api.createTeam(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setCreateTeamOpen(false);
      setTeamName('');
      setTeamDesc('');
      setTeamDeptId('');
      toast.success('Team created successfully.');
    },
    onError: () => toast.error('Failed to create team.'),
  });

  // Team Delete Mutation
  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => api.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Team deleted.');
    },
  });

  const handleDeleteTeam = async (id: string) => {
    if (!await confirm({
      title: 'Delete Team',
      message: 'Delete this team? Its roster will be removed. Projects assigned to it are not deleted.',
      confirmText: 'Delete Team',
      type: 'danger'
    })) return;
    deleteTeamMutation.mutate(id);
  };

  // Team Member Add/Remove Mutations
  const addTeamMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => api.addTeamMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Member added to team.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to add member.'),
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => api.removeTeamMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Member removed from team.');
    },
  });

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

  const handleCreateDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    createDeptMutation.mutate({ name: deptName, description: deptDesc });
  };

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

  const handleVerificationToggle = (userId: string, currentStatus: boolean) => {
    toggleVerifyMutation.mutate({ id: userId, isVerified: !currentStatus });
  };

  const handleDeleteDept = async (id: string) => {
    if (!await confirm({
      title: 'Delete Department',
      message: 'Are you sure you want to delete this department? This will affect attached members.',
      confirmText: 'Delete Department',
      type: 'danger'
    })) return;
    deleteDeptMutation.mutate(id);
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
        customRoleId: editCustomRole || null
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
    if (adminNewPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
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
          <p className="text-sm text-muted-foreground mt-0.5">Control employee roles, manage departments, and audit security events.</p>
        </div>

        {activeTab === 'departments' && (
          <button
            onClick={() => setCreateDeptOpen(true)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Department</span>
          </button>
        )}

        {activeTab === 'teams' && (
          <button
            onClick={() => setCreateTeamOpen(true)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Team</span>
          </button>
        )}

        {activeTab === 'roles' && (
          <button
            onClick={() => setCreateRoleOpen(true)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Role</span>
          </button>
        )}

        {activeTab === 'users' && (
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
          onClick={() => setActiveTab('departments')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition-all leading-none ${
            activeTab === 'departments' ? 'border-primary text-primary font-black' : 'border-transparent hover:text-foreground'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Departments</span>
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition-all leading-none ${
            activeTab === 'teams' ? 'border-primary text-primary font-black' : 'border-transparent hover:text-foreground'
          }`}
        >
          <UsersRound className="h-4 w-4" />
          <span>Teams</span>
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
          onClick={() => setActiveTab('system')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition-all leading-none ${
            activeTab === 'system' ? 'border-primary text-primary font-black' : 'border-transparent hover:text-foreground'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>System Monitors</span>
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

        <button
          onClick={() => setActiveTab('org')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition-all leading-none ${
            activeTab === 'org' ? 'border-primary text-primary font-black' : 'border-transparent hover:text-foreground'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Organization</span>
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
                onChange={(e) => setUserSearch(e.target.value)}
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
                  <th className="pb-3">Verification</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold text-slate-650 dark:text-slate-350">
                {loadingUsers || loadingRoles ? (
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
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-extrabold ${
                          u.isVerified ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {u.isVerified ? 'Verified' : 'Suspended'}
                        </span>
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

                        {/* Suspend/Activate Button */}
                        <button
                          onClick={() => handleVerificationToggle(u.id, u.isVerified)}
                          className={`text-[10px] font-bold px-2.5 py-1 border rounded-lg transition-all ${
                            u.isVerified 
                              ? 'text-amber-500 border-amber-200 dark:border-amber-955 hover:bg-amber-50 dark:hover:bg-amber-955/20' 
                              : 'text-green-500 border-green-200 dark:border-green-955 hover:bg-green-55/20'
                          }`}
                          id={`verify-user-btn-${u.id}`}
                        >
                          {u.isVerified ? 'Suspend' : 'Activate'}
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
          </div>
        )}

        {/* Departments Workspace */}
        {activeTab === 'departments' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b text-slate-400 uppercase text-[9px] tracking-wider font-bold">
                <th className="pb-3">Department Name</th>
                <th className="pb-3">Manager</th>
                <th className="pb-3">Description</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y font-semibold text-slate-600 dark:text-slate-350">
              {loadingDepts ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400">Loading department structures...</td>
                </tr>
              ) : (
                depts?.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="py-3.5 font-bold text-primary">{d.name}</td>
                    <td className="py-3.5">
                      {d.manager ? `${d.manager.firstName} ${d.manager.lastName}` : 'No manager assigned'}
                    </td>
                    <td className="py-3.5 text-slate-400">{d.description || 'No description provided.'}</td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteDept(d.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Team Management Workspace */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingTeams ? (
              <div className="col-span-2 flex items-center justify-center py-20 text-slate-450">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                <span>Loading teams...</span>
              </div>
            ) : teams?.length === 0 ? (
              <div className="col-span-2 text-center py-16 text-slate-400 text-xs">
                No teams yet. Create one to start building rosters.
              </div>
            ) : (
              teams?.map((t: any) => (
                <div key={t.id} className="border rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm flex items-center gap-1.5">
                        <UsersRound className="h-4 w-4 text-primary" />
                        <span>{t.name}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">{t.department?.name} · {t.members?.length || 0} member{t.members?.length === 1 ? '' : 's'} · {t._count?.projects || 0} project{t._count?.projects === 1 ? '' : 's'}</p>
                      {t.description && <p className="text-[10px] text-slate-450 mt-1">{t.description}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteTeam(t.id)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {t.members?.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic">No members yet.</span>
                    ) : (
                      t.members.map((m: any) => (
                        <span key={m.id} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-900 border rounded-full text-[10px] font-semibold">
                          {m.user.firstName} {m.user.lastName}
                          <button
                            onClick={() => removeTeamMemberMutation.mutate({ teamId: t.id, userId: m.userId })}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={manageTeamRosterId === t.id ? addMemberUserId : ''}
                      onChange={(e) => {
                        setManageTeamRosterId(t.id);
                        setAddMemberUserId(e.target.value);
                      }}
                      className="flex-1 bg-white dark:bg-slate-900 border rounded-lg px-2 py-1.5 text-[10px] focus:outline-none"
                    >
                      <option value="">-- Add a member --</option>
                      {systemUsers
                        ?.filter((u: any) => !t.members?.some((m: any) => m.userId === u.id))
                        .map((u: any) => (
                          <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                        ))}
                    </select>
                    <button
                      onClick={() => {
                        if (!addMemberUserId || manageTeamRosterId !== t.id) return;
                        addTeamMemberMutation.mutate({ teamId: t.id, userId: addMemberUserId });
                        setAddMemberUserId('');
                        setManageTeamRosterId(null);
                      }}
                      disabled={manageTeamRosterId !== t.id || !addMemberUserId}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-bold hover:opacity-90 disabled:opacity-40 transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))
            )}
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
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
                {/* Search input */}
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="Search logs by user email or description..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
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
                    onChange={(e) => setLogActionFilter(e.target.value)}
                    className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-xs cursor-pointer max-w-[200px] truncate focus:outline-none"
                  >
                    <option value="ALL">All Actions</option>
                    {uniqueLogActions.map((action) => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reset filter action */}
              {(logSearch || logActionFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setLogSearch('');
                    setLogActionFilter('ALL');
                  }}
                  className="px-3 py-1.5 text-slate-550 hover:text-slate-800 text-xs transition-all font-semibold"
                >
                  Clear Filters
                </button>
              )}
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
          </div>
        )}

        {/* System Monitors Workspace */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">Real-time Performance & Operations</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Automatic polling active every 5 seconds.</p>
              </div>
              <button 
                onClick={() => refetchMetrics()} 
                className="px-3.5 py-1.5 bg-slate-55 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
              >
                Refresh Now
              </button>
            </div>

            {!metrics ? (
              <div className="flex items-center justify-center py-20 text-slate-450">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                <span>Gathering host system metrics...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                
                {/* System CPU / Memory Card */}
                <div className="border rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 opacity-5 dark:opacity-10 text-primary">
                    <Activity className="h-24 w-24" />
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs">Host Resources</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <div className="space-y-3 leading-normal font-semibold">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total CPU Usage Time</span>
                        <span>{metrics.system?.cpuUsage}s</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all" 
                          style={{ width: `${Math.min(parseFloat(metrics.system?.cpuUsage || '0') * 5, 100)}%` }} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Process Memory (RSS)</span>
                        <span>{metrics.system?.processMemory} MB</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full transition-all" 
                          style={{ width: `${Math.min((parseFloat(metrics.system?.processMemory || '0') / 500) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1 space-y-0.5 font-bold border-t border-dashed">
                      <p>Machine RAM Total: {metrics.system?.totalMemory} GB</p>
                      <p>Machine RAM Free: {metrics.system?.freeMemory} GB</p>
                    </div>
                  </div>
                </div>

                {/* Database Metrics Card */}
                <div className="border rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs">PostgreSQL Health</span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-lg font-black border border-emerald-500/20 uppercase">Connected</span>
                  </div>
                  <div className="space-y-3.5 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Connections</span>
                      <span className="text-foreground font-bold">{metrics.database?.activeConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total System Users</span>
                      <span className="text-foreground font-bold">{metrics.database?.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Board Tasks</span>
                      <span className="text-foreground font-bold">{metrics.database?.totalTasks}</span>
                    </div>
                  </div>
                </div>

                {/* Redis Metrics Card */}
                <div className="border rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs">Redis Cache & Locks</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black border uppercase ${
                      metrics.redis?.status === 'Healthy' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {metrics.redis?.status}
                    </span>
                  </div>
                  <div className="space-y-3.5 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Cached Keys</span>
                      <span className="text-foreground font-bold">{metrics.redis?.keysCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Brute Force Protection</span>
                      <span className="text-emerald-500 font-bold">Enabled</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Protocol Driver</span>
                      <span className="text-foreground font-bold">RESP3</span>
                    </div>
                  </div>
                </div>

                {/* Worker queues / logs Card */}
                <div className="border rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs">Background Workers</span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-lg font-black border border-emerald-500/20 uppercase">Running</span>
                  </div>
                  <div className="space-y-3.5 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Security Audit Logs</span>
                      <span className="text-foreground font-bold">{metrics.queue?.totalAuditLogs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Worker Instances</span>
                      <span className="text-foreground font-bold">1 (Internal)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status</span>
                      <span className="text-emerald-500 font-bold">{metrics.queue?.workerStatus}</span>
                    </div>
                  </div>
                </div>

              </div>
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
                {EMAIL_FEATURES.map(({ key, label, description, icon: Icon }) => {
                  const isEnabled = emailFeatureSettings ? !!emailFeatureSettings[key] : true;
                  return (
                    <div
                      key={key}
                      className="border rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/30 flex items-start justify-between gap-4"
                    >
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Organization Settings Workspace */}
        {activeTab === 'org' && (
          <div className="space-y-6 animate-in fade-in duration-200 text-xs max-w-3xl">
            <div className="border-b pb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-foreground">Organization Branding & Configuration</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  These values propagate everywhere automatically — the sidebar, login/registration screens, outbound
                  emails, the public landing page, and file watermarks all read from here. No code change needed.
                </p>
              </div>
              {orgSettingsData?.updatedAt && (
                <span className="text-[9px] text-slate-400 whitespace-nowrap shrink-0 pt-0.5">
                  Last updated {new Date(orgSettingsData.updatedAt).toLocaleString()}
                </span>
              )}
            </div>

            {loadingOrgSettings ? (
              <div className="flex items-center justify-center py-20 text-slate-450">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                <span>Loading organization settings...</span>
              </div>
            ) : (
              <div className="space-y-5 pt-1">
                {/* Identity */}
                <div className="border rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Identity</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Organization Name</label>
                      <input
                        type="text"
                        value={orgForm.orgName || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, orgName: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="ConnectHub"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Tagline</label>
                      <input
                        type="text"
                        value={orgForm.tagline || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, tagline: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="Enterprise Communication & Collaboration Platform"
                      />
                    </div>
                  </div>
                </div>

                {/* Branding */}
                <div className="border rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                    <Palette className="h-3.5 w-3.5" />
                    <span>Branding</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Logo
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                          {orgForm.logoUrl ? (
                            <img src={orgForm.logoUrl} alt="Organization logo" className="h-full w-full object-contain" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label
                            htmlFor="org-logo-upload"
                            className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-[10px] font-bold transition-all"
                          >
                            {uploadLogoMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            <span>{orgForm.logoUrl ? 'Replace Logo' : 'Upload Logo'}</span>
                          </label>
                          <input
                            id="org-logo-upload"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp"
                            onChange={handleLogoFileChange}
                            disabled={uploadLogoMutation.isPending}
                            className="hidden"
                          />
                          {orgForm.logoUrl && (
                            <button
                              onClick={handleRemoveLogo}
                              className="w-full text-[10px] text-red-500 hover:text-red-600 font-semibold"
                            >
                              Remove logo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Favicon
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                          {orgForm.faviconUrl ? (
                            <img src={orgForm.faviconUrl} alt="Organization favicon" className="h-full w-full object-contain" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label
                            htmlFor="org-favicon-upload"
                            className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-[10px] font-bold transition-all"
                          >
                            {uploadFaviconMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            <span>{orgForm.faviconUrl ? 'Replace Favicon' : 'Upload Favicon'}</span>
                          </label>
                          <input
                            id="org-favicon-upload"
                            type="file"
                            accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                            onChange={handleFaviconFileChange}
                            disabled={uploadFaviconMutation.isPending}
                            className="hidden"
                          />
                          {orgForm.faviconUrl && (
                            <button
                              onClick={handleRemoveFavicon}
                              className="w-full text-[10px] text-red-500 hover:text-red-600 font-semibold"
                            >
                              Remove favicon
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={orgForm.primaryColor || '#4f46e5'}
                          onChange={(e) => setOrgForm({ ...orgForm, primaryColor: e.target.value })}
                          className="h-9 w-12 border rounded-lg bg-white dark:bg-slate-900 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={orgForm.primaryColor || ''}
                          onChange={(e) => setOrgForm({ ...orgForm, primaryColor: e.target.value })}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v)) {
                              toast.error('Primary color must be a valid hex code, e.g. #4f46e5.');
                            }
                          }}
                          className="flex-1 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                          placeholder="#4f46e5"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="border rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Contact</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Support Email</label>
                      <input
                        type="email"
                        value={orgForm.supportEmail || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, supportEmail: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="support@example.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Website
                      </label>
                      <input
                        type="text"
                        value={orgForm.website || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Address
                      </label>
                      <input
                        type="text"
                        value={orgForm.address || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="123 Main St, Suite 100, San Francisco, CA"
                      />
                    </div>
                  </div>
                </div>

                {/* Defaults */}
                <div className="border rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Defaults</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Default Watermark Text</label>
                      <input
                        type="text"
                        value={orgForm.defaultWatermarkText || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, defaultWatermarkText: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="ConnectHub CONFIDENTIAL"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Default Timezone</label>
                      <select
                        value={orgForm.defaultTimezone || 'UTC'}
                        onChange={(e) => setOrgForm({ ...orgForm, defaultTimezone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                      >
                        {COMMON_TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                        ))}
                      </select>
                      <p className="text-[9px] text-slate-400">Applied to new employees' accounts when they register or accept an invite.</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveOrgSettings}
                    disabled={updateOrgSettingsMutation.isPending}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {updateOrgSettingsMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>Save Organization Settings</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Department Modal */}
      {createDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setCreateDeptOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Establish New Department</h3>
              <p className="text-xs text-slate-400">Organize and segment user pools into functional divisions.</p>
            </div>
            <form onSubmit={handleCreateDeptSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finance Division"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Description</label>
                <textarea
                  placeholder="Functional division details..."
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                Establish division
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {createTeamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setCreateTeamOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Create New Team</h3>
              <p className="text-xs text-slate-400">Build a roster within a department to organize projects and members.</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!teamName.trim() || !teamDeptId) return;
                createTeamMutation.mutate({ name: teamName, description: teamDesc || undefined, departmentId: teamDeptId });
              }}
              className="space-y-4 text-xs font-semibold"
            >
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Platform Engineering"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Department</label>
                <select
                  required
                  value={teamDeptId}
                  onChange={(e) => setTeamDeptId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                >
                  <option value="">-- Select a department --</option>
                  {depts?.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Description (optional)</label>
                <textarea
                  placeholder="What does this team own..."
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createTeamMutation.isPending}
                className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
              </button>
            </form>
          </div>
        </div>
      )}

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
                    className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs"
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
