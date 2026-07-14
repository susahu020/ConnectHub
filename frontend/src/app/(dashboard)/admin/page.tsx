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
  X,
  Copy,
  Save,
  Activity
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';

const MODULES = ['Dashboard', 'Users', 'Groups', 'Announcements', 'Tasks', 'Files', 'Messages', 'Notifications', 'Reports', 'Admin', 'Analytics', 'Settings'];
const ACTIONS = ['Create', 'Read', 'Update', 'Delete', 'Export', 'Import', 'Approve', 'Assign', 'Archive', 'Publish'];

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'roles' | 'logs' | 'system'>('users');

  // Search & Filter system items
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('ALL');

  // Department creation state
  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

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

  const handleDeleteDept = (id: string) => {
    if (!confirm('Are you sure you want to delete this department? This will affect attached members.')) return;
    deleteDeptMutation.mutate(id);
  };

  const handleDeleteRole = (id: string) => {
    if (!confirm('Delete this custom role? This action cannot be undone.')) return;
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

        {activeTab === 'roles' && (
          <button
            onClick={() => setCreateRoleOpen(true)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Role</span>
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
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => handleVerificationToggle(u.id, u.isVerified)}
                          className={`text-[10px] font-bold px-2.5 py-1 border rounded-lg transition-all ${
                            u.isVerified 
                              ? 'text-red-500 border-red-200 dark:border-red-955 hover:bg-red-50 dark:hover:bg-red-955/20' 
                              : 'text-green-500 border-green-200 dark:border-green-955 hover:bg-green-55/20'
                          }`}
                        >
                          {u.isVerified ? 'Suspend User' : 'Activate User'}
                        </button>
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
      </div>

      {/* Create Department Modal */}
      {createDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
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

      {/* Create Custom Role Modal */}
      {createRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
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
    </div>
  );
}
