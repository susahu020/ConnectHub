'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  Save,
  Upload,
  Send,
  Mail,
  Globe,
  MapPin,
  Image as ImageIcon,
  FileText,
  Palette,
  HeartPulse,
  Loader2,
  MonitorSmartphone,
} from 'lucide-react';
import { api } from '../../../../services/api';
import { useAuthStore } from '../../../../lib/store';
import { toast } from 'react-hot-toast';

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

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/unauthorized');
    }
  }, [user, router]);

  const { data: orgSettingsData, isLoading: loadingOrgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: () => api.getOrganizationSettings(),
    enabled: user?.role === 'ADMIN',
  });

  const [orgForm, setOrgForm] = useState<Record<string, string>>({});
  const [allowedDomainsInput, setAllowedDomainsInput] = useState('');
  const [ssoGoogleEnabled, setSsoGoogleEnabled] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

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
        registrationMode: orgSettingsData.registrationMode || 'INVITE_ONLY',
        alertWebhookUrl: orgSettingsData.alertWebhookUrl || '',
        duplicateLoginPolicy: orgSettingsData.duplicateLoginPolicy || 'SINGLE_SESSION',
      });
      setAllowedDomainsInput((orgSettingsData.allowedDomains || []).join(', '));
      setSsoGoogleEnabled(orgSettingsData.ssoGoogleEnabled !== false);
      setMfaRequired(orgSettingsData.mfaRequired === true);
    }
  }, [orgSettingsData]);

  const updateOrgSettingsMutation = useMutation({
    mutationFn: (updates: Record<string, string | null | string[] | boolean>) => api.updateOrganizationSettings(updates),
    onSuccess: (data) => {
      // Keep this page's own cache entry in sync, and also update the
      // shared ['organization-settings'] key that every page in the app
      // reads from via useOrganizationSettings — so the change is reflected
      // everywhere (sidebar, auth pages, emails, landing page) right away.
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
    updateOrgSettingsMutation.mutate({ ...orgForm, allowedDomains, ssoGoogleEnabled, mfaRequired });
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

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your workspace's identity, branding, and access rules.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm overflow-x-auto min-h-[400px]">
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

              <div className="space-y-3 border rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b pb-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Access & Registration</span>
                </div>
                <p className="text-[10px] text-slate-400 -mt-1">
                  Controls how new accounts can be created once your workspace is set up. The very first Admin
                  account is always exempt from this — it always gets in, so there's someone to configure it.
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Registration Mode</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'INVITE_ONLY', title: 'Invite Only (Recommended)', desc: "Nobody can self-register. Every account starts as an invitation from an Admin or Manager." },
                      { value: 'DOMAIN_RESTRICTED', title: 'Company Domain Self-Signup', desc: 'Anyone with an email on your approved domain(s) below can sign themselves up. Invitations still work too.' },
                      { value: 'OPEN', title: 'Open Registration', desc: 'Anyone, anywhere, can create an account. Not recommended for a real company deployment — mainly useful for demos/trials.' },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          orgForm.registrationMode === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
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
                          <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                {orgForm.registrationMode === 'DOMAIN_RESTRICTED' && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Allowed Email Domains</label>
                    <input
                      type="text"
                      value={allowedDomainsInput}
                      onChange={(e) => setAllowedDomainsInput(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                      placeholder="yourcompany.com, yourcompany.io"
                    />
                    <p className="text-[9px] text-slate-400">Comma-separated. Anyone signing up with an email on one of these domains is auto-approved as an Employee.</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-800/30">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Require Two-Factor Authentication</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={mfaRequired}
                    aria-label="Require two-factor authentication for all users"
                    onClick={() => setMfaRequired(!mfaRequired)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${mfaRequired ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mfaRequired ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 -mt-1">
                  When on, every user must set up 2FA before they can use the rest of the app. Anyone without it
                  enabled yet is limited to the 2FA setup screen the next time they load a page — nobody is signed
                  out or locked out immediately when you turn this on.
                </p>
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b pb-2">
                  <MonitorSmartphone className="h-3.5 w-3.5" />
                  <span>Session & Login Policy</span>
                </div>
                <p className="text-[10px] text-slate-400 -mt-1">
                  Controls whether the same account can be signed in from more than one browser or device at
                  the same time. Employees can always see and manage their own active sessions from Settings →
                  Security.
                </p>
                <div className="space-y-1">
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'SINGLE_SESSION', title: 'Single Session (Recommended)', desc: 'Signing in on a new browser or device automatically signs the account out everywhere else. Prevents the same credentials from being logged in in two places at once.' },
                      { value: 'LIMIT_3', title: 'Up to 3 Devices', desc: 'Allows up to 3 concurrent sessions per account. Signing in on a 4th device signs out the oldest one.' },
                      { value: 'UNLIMITED', title: 'Unlimited', desc: 'No restriction — the same credentials can stay signed in on any number of browsers/devices at once. Not recommended.' },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          orgForm.duplicateLoginPolicy === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="duplicateLoginPolicy"
                          value={opt.value}
                          checked={orgForm.duplicateLoginPolicy === opt.value}
                          onChange={(e) => setOrgForm({ ...orgForm, duplicateLoginPolicy: e.target.value })}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="font-bold text-foreground">{opt.title}</p>
                          <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-800/30">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Single Sign-On (Google)</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${orgSettingsData?.ssoGoogleAvailable ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {orgSettingsData?.ssoGoogleAvailable ? 'Active' : 'Not Configured'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 -mt-1">
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
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${ssoGoogleEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ssoGoogleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-xs font-bold">{ssoGoogleEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b pb-2">
                  <HeartPulse className="h-3.5 w-3.5" />
                  <span>Health Alerts</span>
                </div>
                <p className="text-[10px] text-slate-400 -mt-1">
                  Get notified the moment System Health status changes — checked every 2 minutes in the
                  background, whether or not anyone has the System Health tab open. Works with a Slack incoming
                  webhook URL, or any endpoint that accepts a JSON POST.
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Alert Webhook URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={orgForm.alertWebhookUrl || ''}
                      onChange={(e) => setOrgForm({ ...orgForm, alertWebhookUrl: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                      placeholder="https://hooks.slack.com/services/..."
                    />
                    <button
                      type="button"
                      onClick={() => sendTestAlertMutation.mutate(orgForm.alertWebhookUrl)}
                      disabled={sendTestAlertMutation.isPending || !orgForm.alertWebhookUrl}
                      className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                    >
                      {sendTestAlertMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Send Test
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400">Leave blank to disable alerting. "Send Test" tries the URL above immediately, even before you save.</p>
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
      </div>
    </div>
  );
}
