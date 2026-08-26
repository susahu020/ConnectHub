'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Building2,
  UsersRound,
  Plus,
  Loader2,
  Trash2,
  X,
  ShieldCheck,
  Save,
  Upload,
  Send,
  Mail,
  Phone,
  Globe,
  MapPin,
  Image as ImageIcon,
  FileText,
  Palette,
  HeartPulse,
  ClipboardPen,
} from 'lucide-react';
import { api } from '../../../services/api';
import { CurvedTabs } from '../../../components/ui/CurvedTabs';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

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

export default function OrganizationPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'org' | 'departments' | 'teams'>('org');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/unauthorized');
    }
  }, [user, router]);

  // ---------------------------------------------------------------------
  // Organization Settings
  // ---------------------------------------------------------------------
  const { data: orgSettingsData, isLoading: loadingOrgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: () => api.getOrganizationSettings(),
    enabled: user?.role === 'ADMIN' && activeTab === 'org',
  });

  const [orgForm, setOrgForm] = useState<Record<string, string>>({});
  const [allowedDomainsInput, setAllowedDomainsInput] = useState('');
  const [ssoGoogleEnabled, setSsoGoogleEnabled] = useState(true);

  useEffect(() => {
    if (orgSettingsData) {
      setOrgForm({
        orgName: orgSettingsData.orgName || '',
        tagline: orgSettingsData.tagline || '',
        logoUrl: orgSettingsData.logoUrl || '',
        faviconUrl: orgSettingsData.faviconUrl || '',
        primaryColor: orgSettingsData.primaryColor || '#4f46e5',
        supportEmail: orgSettingsData.supportEmail || '',
        supportPhone: orgSettingsData.supportPhone || '',
        website: orgSettingsData.website || '',
        address: orgSettingsData.address || '',
        defaultWatermarkText: orgSettingsData.defaultWatermarkText || '',
        defaultTimezone: orgSettingsData.defaultTimezone || '',
        registrationMode: orgSettingsData.registrationMode || 'INVITE_ONLY',
        alertWebhookUrl: orgSettingsData.alertWebhookUrl || '',
      });
      setAllowedDomainsInput((orgSettingsData.allowedDomains || []).join(', '));
      setSsoGoogleEnabled(orgSettingsData.ssoGoogleEnabled !== false);
    }
  }, [orgSettingsData]);

  const updateOrgSettingsMutation = useMutation({
    mutationFn: (updates: Record<string, string | null | string[] | boolean>) => api.updateOrganizationSettings(updates),
    onSuccess: (data) => {
      queryClient.setQueryData(['organization-settings'], data);
      toast.success('Organization settings updated.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update organization settings.');
    },
  });

  const handleSaveOrgSettings = () => {
    const allowedDomains = allowedDomainsInput
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
    updateOrgSettingsMutation.mutate({ ...orgForm, allowedDomains, ssoGoogleEnabled });
  };

  const sendTestAlertMutation = useMutation({
    mutationFn: (webhookUrl?: string) => api.sendTestHealthAlert(webhookUrl),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Test alert sent.');
      } else {
        toast.error(data.message || 'Could not send test alert.');
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to send test alert.');
    },
  });

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

  // ---------------------------------------------------------------------
  // Departments
  // ---------------------------------------------------------------------
  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptManagerId, setDeptManagerId] = useState('');

  const [editDept, setEditDept] = useState<any | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');
  const [editDeptManagerId, setEditDeptManagerId] = useState('');

  const { data: depts, isLoading: loadingDepts } = useQuery({
    queryKey: ['admin-depts'],
    queryFn: () => api.getDepartments(),
    enabled: user?.role === 'ADMIN',
  });

  const createDeptMutation = useMutation({
    mutationFn: (body: any) => api.createDepartment(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
      setCreateDeptOpen(false);
      setDeptName('');
      setDeptDesc('');
      setDeptManagerId('');
      toast.success('Department created successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create department.'),
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.updateDepartment(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
      setEditDept(null);
      toast.success('Department updated successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update department.'),
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => api.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
      toast.success('Department deleted.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete department.'),
  });

  const handleCreateDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    createDeptMutation.mutate({ name: deptName, description: deptDesc, managerId: deptManagerId || undefined });
  };

  const openEditDept = (d: any) => {
    setEditDept(d);
    setEditDeptName(d.name || '');
    setEditDeptDesc(d.description || '');
    setEditDeptManagerId(d.managerId || d.manager?.id || '');
  };

  const handleEditDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDept || !editDeptName.trim()) return;
    updateDeptMutation.mutate({
      id: editDept.id,
      body: { name: editDeptName, description: editDeptDesc, managerId: editDeptManagerId || null },
    });
  };

  const handleDeleteDept = async (id: string) => {
    if (!await confirm({
      title: 'Delete Department',
      message: 'This permanently deletes every team in this department (and their rosters), and any chat groups scoped to it. Employees and tasks are unassigned, not deleted, but the teams and groups cannot be recovered. Are you sure?',
      confirmText: 'Delete Department',
      type: 'danger',
    })) return;
    deleteDeptMutation.mutate(id);
  };

  // ---------------------------------------------------------------------
  // Teams
  // ---------------------------------------------------------------------
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamDeptId, setTeamDeptId] = useState('');
  const [manageTeamRosterId, setManageTeamRosterId] = useState<string | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState('');

  const [editTeam, setEditTeam] = useState<any | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDesc, setEditTeamDesc] = useState('');
  const [editTeamDeptId, setEditTeamDeptId] = useState('');

  const { data: systemUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getAdminUsers(),
    enabled: user?.role === 'ADMIN' && (activeTab === 'teams' || activeTab === 'departments'),
  });

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => api.getTeams(),
    enabled: user?.role === 'ADMIN' && activeTab === 'teams',
  });

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

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => api.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Team deleted.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete team.'),
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.updateTeam(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setEditTeam(null);
      toast.success('Team updated successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update team.'),
  });

  const openEditTeam = (t: any) => {
    setEditTeam(t);
    setEditTeamName(t.name || '');
    setEditTeamDesc(t.description || '');
    setEditTeamDeptId(t.departmentId || t.department?.id || '');
  };

  const handleEditTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeam || !editTeamName.trim() || !editTeamDeptId) return;
    updateTeamMutation.mutate({
      id: editTeam.id,
      body: { name: editTeamName, description: editTeamDesc, departmentId: editTeamDeptId },
    });
  };

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

  const handleDeleteTeam = async (id: string) => {
    if (!await confirm({
      title: 'Delete Team',
      message: 'Delete this team? Its roster will be removed. Projects assigned to it are not deleted.',
      confirmText: 'Delete Team',
      type: 'danger',
    })) return;
    deleteTeamMutation.mutate(id);
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
          <h1 className="text-3xl font-extrabold tracking-tight">Organization</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure your workspace, and manage departments and teams.</p>
        </div>

        {activeTab === 'departments' && (
          <button
            onClick={() => setCreateDeptOpen(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Department</span>
          </button>
        )}

        {activeTab === 'teams' && (
          <button
            onClick={() => setCreateTeamOpen(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <CurvedTabs
        className="mb-0"
        tabs={[
          { id: 'org', label: 'Organization', icon: <Building2 className="h-4 w-4" /> },
          { id: 'departments', label: 'Departments', icon: <Building2 className="h-4 w-4" /> },
          { id: 'teams', label: 'Teams', icon: <UsersRound className="h-4 w-4" /> },
        ]}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as typeof activeTab)}
      />

      {/* Tab Workspaces */}
      <div className="bg-card dark:bg-card border rounded-2xl p-6 shadow-sm overflow-x-auto min-h-[400px]">
        {/* Organization Settings Workspace */}
        {activeTab === 'org' && (
          <div className="space-y-6 animate-in fade-in duration-200 text-xs max-w-3xl">
            <div className="border-b pb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-foreground">Organization Branding & Configuration</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  These values propagate everywhere automatically — the sidebar, login/registration screens, outbound
                  emails, the public landing page, and file watermarks all read from here. No code change needed.
                </p>
              </div>
              {orgSettingsData?.updatedAt && (
                <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                  Last updated {new Date(orgSettingsData.updatedAt).toLocaleString()}
                </span>
              )}
            </div>

            {loadingOrgSettings ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                <span>Loading organization settings...</span>
              </div>
            ) : (
              <div className="space-y-5 pt-1">
                {/* Identity */}
                <div className="border rounded-2xl p-4 bg-muted/40 dark:bg-card/30 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Identity</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Organization Name</label>
                      <input
                        type="text"
                        value={orgForm.orgName || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, orgName: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="ConnectHub"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Tagline</label>
                      <input
                        type="text"
                        value={orgForm.tagline || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, tagline: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="Enterprise Communication & Collaboration Platform"
                      />
                    </div>
                  </div>
                </div>

                {/* Branding */}
                <div className="border rounded-2xl p-4 bg-muted/40 dark:bg-card/30 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                    <Palette className="h-3.5 w-3.5" />
                    <span>Branding</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Logo
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 rounded-xl border bg-card dark:bg-card flex items-center justify-center overflow-hidden">
                          {orgForm.logoUrl ? (
                            <img src={orgForm.logoUrl} alt="Organization logo" className="h-full w-full object-contain" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-foreground" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label
                            htmlFor="org-logo-upload"
                            className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl bg-card dark:bg-card hover:bg-muted dark:hover:bg-card cursor-pointer text-[10px] font-bold transition-all"
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
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Favicon
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 rounded-xl border bg-card dark:bg-card flex items-center justify-center overflow-hidden">
                          {orgForm.faviconUrl ? (
                            <img src={orgForm.faviconUrl} alt="Organization favicon" className="h-full w-full object-contain" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-foreground" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label
                            htmlFor="org-favicon-upload"
                            className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl bg-card dark:bg-card hover:bg-muted dark:hover:bg-card cursor-pointer text-[10px] font-bold transition-all"
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
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={orgForm.primaryColor || '#4f46e5'}
                          onChange={(e) => setOrgForm({ ...orgForm, primaryColor: e.target.value })}
                          className="h-9 w-12 border rounded-lg bg-card dark:bg-card cursor-pointer shrink-0"
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
                          className="flex-1 px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                          placeholder="#4f46e5"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="border rounded-2xl p-4 bg-muted/40 dark:bg-card/30 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Contact</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Support Email</label>
                      <input
                        type="email"
                        value={orgForm.supportEmail || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, supportEmail: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="support@example.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Support Phone
                      </label>
                      <input
                        type="tel"
                        value={orgForm.supportPhone || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, supportPhone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="+1 (800) 555-0100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Website
                      </label>
                      <input
                        type="text"
                        value={orgForm.website || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Address
                      </label>
                      <input
                        type="text"
                        value={orgForm.address || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="123 Main St, Suite 100, San Francisco, CA"
                      />
                    </div>
                  </div>
                </div>

                {/* Defaults */}
                <div className="border rounded-2xl p-4 bg-muted/40 dark:bg-card/30 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Defaults</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Default Watermark Text</label>
                      <input
                        type="text"
                        value={orgForm.defaultWatermarkText || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, defaultWatermarkText: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="ConnectHub CONFIDENTIAL"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Default Timezone</label>
                      <select
                        value={orgForm.defaultTimezone || 'UTC'}
                        onChange={(e) => setOrgForm({ ...orgForm, defaultTimezone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                      >
                        {COMMON_TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                        ))}
                      </select>
                      <p className="text-[9px] text-muted-foreground">Applied to new employees' accounts when they register or accept an invite.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b pb-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Access & Registration</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground -mt-1">
                    Controls how new accounts can be created once your workspace is set up. The very first Admin
                    account is always exempt from this — it always gets in, so there's someone to configure it.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Registration Mode</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { value: 'INVITE_ONLY', title: 'Invite Only (Recommended)', desc: "Nobody can self-register. Every account starts as an invitation from an Admin or Manager." },
                        { value: 'DOMAIN_RESTRICTED', title: 'Company Domain Self-Signup', desc: 'Anyone with an email on your approved domain(s) below can sign themselves up. Invitations still work too.' },
                        { value: 'OPEN', title: 'Open Registration', desc: 'Anyone, anywhere, can create an account. Not recommended for a real company deployment — mainly useful for demos/trials.' },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            orgForm.registrationMode === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/60 dark:hover:bg-card/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name="registrationMode"
                            value={opt.value}
                            checked={orgForm.registrationMode === opt.value}
                            onChange={(e) => setOrgForm({ ...orgForm, registrationMode: e.target.value })}
                            className="mt-0.5"
                          />
                          <div>
                            <p className="font-bold text-foreground">{opt.title}</p>
                            <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {orgForm.registrationMode === 'DOMAIN_RESTRICTED' && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Allowed Email Domains</label>
                      <input
                        type="text"
                        value={allowedDomainsInput}
                        onChange={(e) => setAllowedDomainsInput(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="yourcompany.com, yourcompany.io"
                      />
                      <p className="text-[9px] text-muted-foreground">Comma-separated. Anyone signing up with an email on one of these domains is auto-approved as an Employee.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Single Sign-On (Google)</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${orgSettingsData?.ssoGoogleAvailable ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary dark:bg-card text-muted-foreground'}`}>
                      {orgSettingsData?.ssoGoogleAvailable ? 'Active' : 'Not Configured'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground -mt-1">
                    Lets employees sign in with their Google account instead of a password. Requires
                    GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI to be set on the server —
                    that part is infra-level config, not editable here. This toggle lets you turn it off for the
                    workspace even when the server has it configured.
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ssoGoogleEnabled}
                      onClick={() => setSsoGoogleEnabled(!ssoGoogleEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${ssoGoogleEnabled ? 'bg-primary' : 'bg-secondary dark:bg-card'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${ssoGoogleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-xs font-bold">{ssoGoogleEnabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>

                <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b pb-2">
                    <HeartPulse className="h-3.5 w-3.5" />
                    <span>Health Alerts</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground -mt-1">
                    Get notified the moment System Health status changes — checked every 2 minutes in the
                    background, whether or not anyone has the System Health tab open. Works with a Slack incoming
                    webhook URL, or any endpoint that accepts a JSON POST.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Alert Webhook URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={orgForm.alertWebhookUrl || ''}
                        onChange={(e) => setOrgForm({ ...orgForm, alertWebhookUrl: e.target.value })}
                        className="flex-1 px-3 py-2 border rounded-xl bg-card dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                        placeholder="https://hooks.slack.com/services/..."
                      />
                      <button
                        type="button"
                        onClick={() => sendTestAlertMutation.mutate(orgForm.alertWebhookUrl)}
                        disabled={sendTestAlertMutation.isPending || !orgForm.alertWebhookUrl}
                        className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-[11px] font-bold hover:bg-muted dark:hover:bg-card disabled:opacity-50 whitespace-nowrap"
                      >
                        {sendTestAlertMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Send Test
                      </button>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Leave blank to disable alerting. "Send Test" tries the URL above immediately, even before you save.</p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveOrgSettings}
                    disabled={updateOrgSettingsMutation.isPending}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
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

        {/* Departments Workspace */}
        {activeTab === 'departments' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground uppercase text-[9px] tracking-wider font-bold">
                <th className="pb-3">Department Name</th>
                <th className="pb-3">Manager</th>
                <th className="pb-3">Description</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y font-semibold text-muted-foreground dark:text-foreground">
              {loadingDepts ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-muted-foreground">Loading department structures...</td>
                </tr>
              ) : depts?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-muted-foreground">No departments yet. Create one to get started.</td>
                </tr>
              ) : (
                depts?.map((d: any) => (
                  <tr key={d.id} className="hover:bg-muted/50 dark:hover:bg-card/20">
                    <td className="py-3.5 font-bold text-primary">{d.name}</td>
                    <td className="py-3.5">
                      {d.manager ? `${d.manager.firstName} ${d.manager.lastName}` : 'No manager assigned'}
                    </td>
                    <td className="py-3.5 text-muted-foreground">{d.description || 'No description provided.'}</td>
                    <td className="py-3.5 text-right space-x-1">
                      <button
                        onClick={() => openEditDept(d)}
                        className="p-1 hover:bg-muted dark:hover:bg-card text-muted-foreground rounded"
                        title="Edit department"
                      >
                        <ClipboardPen className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDept(d.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded"
                        title="Delete department"
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
              <div className="col-span-2 flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                <span>Loading teams...</span>
              </div>
            ) : teams?.length === 0 ? (
              <div className="col-span-2 text-center py-16 text-muted-foreground text-xs">
                No teams yet. Create one to start building rosters.
              </div>
            ) : (
              teams?.map((t: any) => (
                <div key={t.id} className="border rounded-2xl p-4 bg-muted/40 dark:bg-card/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm flex items-center gap-1.5">
                        <UsersRound className="h-4 w-4 text-primary" />
                        <span>{t.name}</span>
                      </h4>
                      <p className="text-[10px] text-muted-foreground">{t.department?.name} · {t.members?.length || 0} member{t.members?.length === 1 ? '' : 's'} · {t._count?.projects || 0} project{t._count?.projects === 1 ? '' : 's'}</p>
                      {t.description && <p className="text-[10px] text-muted-foreground mt-1">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditTeam(t)}
                        className="p-1 hover:bg-muted dark:hover:bg-card text-muted-foreground rounded"
                        title="Edit team"
                      >
                        <ClipboardPen className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(t.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded"
                        title="Delete team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {t.members?.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground italic">No members yet.</span>
                    ) : (
                      t.members.map((m: any) => (
                        <span key={m.id} className="flex items-center gap-1 px-2 py-1 bg-card dark:bg-card border rounded-full text-[10px] font-semibold">
                          {m.user.firstName} {m.user.lastName}
                          <button
                            onClick={() => removeTeamMemberMutation.mutate({ teamId: t.id, userId: m.userId })}
                            className="text-muted-foreground hover:text-red-500"
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
                      className="flex-1 bg-card dark:bg-card border rounded-lg px-2 py-1.5 text-[10px] focus:outline-none"
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
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold hover:opacity-90 disabled:opacity-40 transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Department Modal */}
      {createDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setCreateDeptOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:bg-muted p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Establish New Department</h3>
              <p className="text-xs text-muted-foreground">Organize and segment user pools into functional divisions.</p>
            </div>
            <form onSubmit={handleCreateDeptSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finance Division"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Description</label>
                <textarea
                  placeholder="Functional division details..."
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Manager (optional)</label>
                <select
                  value={deptManagerId}
                  onChange={(e) => setDeptManagerId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
                >
                  <option value="">-- No manager assigned --</option>
                  {systemUsers?.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={createDeptMutation.isPending}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {createDeptMutation.isPending ? 'Creating...' : 'Establish division'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setEditDept(null)} className="absolute right-4 top-4 text-muted-foreground hover:bg-muted p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Edit Department</h3>
              <p className="text-xs text-muted-foreground">Rename this division, update its description, or reassign its manager.</p>
            </div>
            <form onSubmit={handleEditDeptSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Department Name</label>
                <input
                  type="text"
                  required
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Description</label>
                <textarea
                  value={editDeptDesc}
                  onChange={(e) => setEditDeptDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Manager</label>
                <select
                  value={editDeptManagerId}
                  onChange={(e) => setEditDeptManagerId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
                >
                  <option value="">-- No manager assigned --</option>
                  {systemUsers?.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={updateDeptMutation.isPending}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {updateDeptMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {createTeamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setCreateTeamOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:bg-muted p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Create New Team</h3>
              <p className="text-xs text-muted-foreground">Build a roster within a department to organize projects and members.</p>
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
                <label className="text-muted-foreground uppercase text-[10px]">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Platform Engineering"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Department</label>
                <select
                  required
                  value={teamDeptId}
                  onChange={(e) => setTeamDeptId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
                >
                  <option value="">-- Select a department --</option>
                  {depts?.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Description (optional)</label>
                <textarea
                  placeholder="What does this team own..."
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createTeamMutation.isPending}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setEditTeam(null)} className="absolute right-4 top-4 text-muted-foreground hover:bg-muted p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Edit Team</h3>
              <p className="text-xs text-muted-foreground">Rename this team, update its description, or move it to a different department.</p>
            </div>
            <form onSubmit={handleEditTeamSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Team Name</label>
                <input
                  type="text"
                  required
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Department</label>
                <select
                  required
                  value={editTeamDeptId}
                  onChange={(e) => setEditTeamDeptId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
                >
                  <option value="">-- Select a department --</option>
                  {depts?.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Description</label>
                <textarea
                  value={editTeamDesc}
                  onChange={(e) => setEditTeamDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={updateTeamMutation.isPending}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {updateTeamMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
