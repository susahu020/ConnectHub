'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  BookOpen,
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
  AlertTriangle,
  Trash2,
  Wallet,
  Receipt,
  Clock,
  Plus,
  X,
} from 'lucide-react';
import { api } from '../../../../services/api';
import { useAuthStore } from '../../../../lib/store';
import { getBrowserCoordinates } from '../../../../lib/geolocation';
import { toast } from 'react-hot-toast';

// Mirrors backend/src/services/statutoryDeductions.service.ts's
// DEFAULT_STATUTORY_DEDUCTION_POLICY — kept as a plain literal here rather
// than imported since the frontend and backend are separate packages.
// Every rule starts disabled; see that module's doc comment for why.
const DEFAULT_STATUTORY_POLICY = {
  providentFund: { enabled: false, employeeRatePercent: 12, wageCeiling: 15000 as number | null },
  professionalTax: {
    enabled: false,
    slabs: [
      { minGross: 0, maxGross: 15000 as number | null, amount: 0 },
      { minGross: 15001, maxGross: 25000 as number | null, amount: 150 },
      { minGross: 25001, maxGross: null as number | null, amount: 200 },
    ],
  },
  incomeTax: {
    enabled: false,
    standardDeductionAnnual: 50000,
    annualSlabs: [
      { upToAnnual: 300000 as number | null, ratePercent: 0 },
      { upToAnnual: 700000 as number | null, ratePercent: 5 },
      { upToAnnual: 1000000 as number | null, ratePercent: 10 },
      { upToAnnual: 1200000 as number | null, ratePercent: 15 },
      { upToAnnual: 1500000 as number | null, ratePercent: 20 },
      { upToAnnual: null as number | null, ratePercent: 30 },
    ],
  },
};

// Mirrors backend/src/services/attendanceAnomaly.service.ts's
// DEFAULT_ATTENDANCE_ANOMALY_POLICY.
const DEFAULT_ANOMALY_POLICY = {
  enabled: true,
  maxAbsentDays: 3,
  maxLateDays: 5,
  maxHalfDays: 3,
  maxUnpaidLeaveDays: 3,
};

// Mirrors backend/src/services/geofence.service.ts's
// DEFAULT_ATTENDANCE_GEOFENCE_POLICY.
const DEFAULT_GEOFENCE_POLICY = {
  enabled: false,
  officeLatitude: null as number | null,
  officeLongitude: null as number | null,
  radiusMeters: 200,
  enforceBlock: false,
};

// Mirrors backend/src/services/leaveAccrual.service.ts's
// DEFAULT_LEAVE_ACCRUAL_POLICY. Scoped to just these 4 types in the UI
// (matching RequestLeaveModal's leave-type dropdown) even though the
// backend validator itself accepts arbitrary leave-type keys.
const DEFAULT_LEAVE_ACCRUAL_POLICY_UI: Record<string, { annualTotal: number; monthlyRate: number }> = {
  ANNUAL: { annualTotal: 12, monthlyRate: 1 },
  SICK: { annualTotal: 8, monthlyRate: 8 / 12 },
  CASUAL: { annualTotal: 6, monthlyRate: 0.5 },
  UNPAID: { annualTotal: 30, monthlyRate: 0 },
};

// Mirrors backend/src/services/overtime.service.ts's DEFAULT_OVERTIME_POLICY.
const DEFAULT_OVERTIME_POLICY = {
  enabled: false,
  dailyThresholdHours: 8,
  rateMultiplier: 1.5,
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type StatutoryPolicy = typeof DEFAULT_STATUTORY_POLICY;
type AnomalyPolicy = typeof DEFAULT_ANOMALY_POLICY;
type GeofencePolicy = typeof DEFAULT_GEOFENCE_POLICY;
type OvertimePolicy = typeof DEFAULT_OVERTIME_POLICY;

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
  const [wikiRestrictedPublishing, setWikiRestrictedPublishing] = useState(false);
  const [recycleBinRetentionDays, setRecycleBinRetentionDays] = useState('');
  const [expenseSecondApprovalThreshold, setExpenseSecondApprovalThreshold] = useState('');
  const [statutoryPolicy, setStatutoryPolicy] = useState<StatutoryPolicy>(DEFAULT_STATUTORY_POLICY);
  const [anomalyPolicy, setAnomalyPolicy] = useState<AnomalyPolicy>(DEFAULT_ANOMALY_POLICY);
  const [geofencePolicy, setGeofencePolicy] = useState<GeofencePolicy>(DEFAULT_GEOFENCE_POLICY);
  const [geofenceLocating, setGeofenceLocating] = useState(false);
  const [lateGraceMinutes, setLateGraceMinutes] = useState('15');
  const [halfDayThresholdHours, setHalfDayThresholdHours] = useState('4');
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([0, 6]);
  const [leaveAccrualPolicy, setLeaveAccrualPolicy] = useState(DEFAULT_LEAVE_ACCRUAL_POLICY_UI);
  const [overtimePolicy, setOvertimePolicy] = useState<OvertimePolicy>(DEFAULT_OVERTIME_POLICY);

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
      setWikiRestrictedPublishing(orgSettingsData.wikiRestrictedPublishing === true);
      setRecycleBinRetentionDays(orgSettingsData.recycleBinRetentionDays ? String(orgSettingsData.recycleBinRetentionDays) : '');
      setExpenseSecondApprovalThreshold(
        orgSettingsData.expenseSecondApprovalThreshold !== null && orgSettingsData.expenseSecondApprovalThreshold !== undefined
          ? String(orgSettingsData.expenseSecondApprovalThreshold)
          : ''
      );
      // Merge over the defaults rather than replacing outright, so a
      // policy saved before a field existed (or a partially-filled one)
      // still renders every control instead of crashing on a missing key.
      if (orgSettingsData.payrollStatutoryPolicy) {
        setStatutoryPolicy((prev) => ({ ...prev, ...orgSettingsData.payrollStatutoryPolicy }));
      }
      if (orgSettingsData.attendanceAnomalyPolicy) {
        setAnomalyPolicy((prev) => ({ ...prev, ...orgSettingsData.attendanceAnomalyPolicy }));
      }
      if (orgSettingsData.attendanceGeofencePolicy) {
        setGeofencePolicy((prev) => ({ ...prev, ...orgSettingsData.attendanceGeofencePolicy }));
      }
      if (orgSettingsData.lateGraceMinutes !== undefined && orgSettingsData.lateGraceMinutes !== null) {
        setLateGraceMinutes(String(orgSettingsData.lateGraceMinutes));
      }
      if (orgSettingsData.halfDayThresholdHours !== undefined && orgSettingsData.halfDayThresholdHours !== null) {
        setHalfDayThresholdHours(String(orgSettingsData.halfDayThresholdHours));
      }
      if (Array.isArray(orgSettingsData.weeklyOffDays)) {
        setWeeklyOffDays(orgSettingsData.weeklyOffDays);
      }
      if (orgSettingsData.leaveAccrualPolicy) {
        setLeaveAccrualPolicy((prev) => ({ ...prev, ...orgSettingsData.leaveAccrualPolicy }));
      }
      if (orgSettingsData.overtimePolicy) {
        setOvertimePolicy((prev) => ({ ...prev, ...orgSettingsData.overtimePolicy }));
      }
    }
  }, [orgSettingsData]);

  const updateOrgSettingsMutation = useMutation({
    mutationFn: (updates: Record<string, string | number | null | string[] | boolean | object>) => api.updateOrganizationSettings(updates),
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
    updateOrgSettingsMutation.mutate({
      ...orgForm,
      allowedDomains,
      ssoGoogleEnabled,
      mfaRequired,
      wikiRestrictedPublishing,
      recycleBinRetentionDays: recycleBinRetentionDays.trim() === '' ? null : Number(recycleBinRetentionDays),
      expenseSecondApprovalThreshold: expenseSecondApprovalThreshold.trim() === '' ? null : Number(expenseSecondApprovalThreshold),
      payrollStatutoryPolicy: statutoryPolicy,
      attendanceAnomalyPolicy: anomalyPolicy,
      attendanceGeofencePolicy: geofencePolicy,
      lateGraceMinutes: Number(lateGraceMinutes) || 0,
      halfDayThresholdHours: Number(halfDayThresholdHours) || 0,
      weeklyOffDays,
      leaveAccrualPolicy,
      overtimePolicy,
    });
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

      <div className="bg-card dark:bg-card border rounded-2xl p-6 shadow-sm overflow-x-auto min-h-[400px]">
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
                    <span>Require Two-Factor Authentication</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={mfaRequired}
                    aria-label="Require two-factor authentication for all users"
                    onClick={() => setMfaRequired(!mfaRequired)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${mfaRequired ? 'bg-primary' : 'bg-secondary dark:bg-card'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${mfaRequired ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
                  When on, every user must set up 2FA before they can use the rest of the app. Anyone without it
                  enabled yet is limited to the 2FA setup screen the next time they load a page — nobody is signed
                  out or locked out immediately when you turn this on.
                </p>
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Restrict Wiki Publishing</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={wikiRestrictedPublishing}
                    aria-label="Restrict wiki publishing to Managers and Admins"
                    onClick={() => setWikiRestrictedPublishing(!wikiRestrictedPublishing)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${wikiRestrictedPublishing ? 'bg-primary' : 'bg-secondary dark:bg-card'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${wikiRestrictedPublishing ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
                  Off (default): the Company Wiki stays open and collaborative — any employee can create and
                  publish pages, like Confluence or Notion. On: only Managers and Admins can create or publish
                  pages; everyone can still read them, and a non-Manager can still save work as a private draft
                  for a moderator to review and publish.
                </p>
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b pb-2">
                  <MonitorSmartphone className="h-3.5 w-3.5" />
                  <span>Session & Login Policy</span>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
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
                          orgForm.duplicateLoginPolicy === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/60 dark:hover:bg-card/60'
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
                          <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b pb-2">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Recycle Bin Retention</span>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
                  How long a deleted file or folder sits in someone's Recycle Bin before it's automatically and
                  permanently purged. Leave blank to keep deleted items forever until someone manually empties
                  their own trash.
                </p>
                <div className="flex items-center gap-2 max-w-xs">
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    placeholder="Forever"
                    value={recycleBinRetentionDays}
                    onChange={(e) => setRecycleBinRetentionDays(e.target.value)}
                    className="w-24 px-3 py-2 rounded-xl border bg-card dark:bg-card text-xs font-bold focus:outline-none"
                  />
                  <span className="text-xs text-muted-foreground font-semibold">days</span>
                </div>
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b pb-2">
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Two-Tier Expense Approval</span>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
                  Expense claims strictly over this amount need a second, different Admin's sign-off after the usual
                  manager/admin approval, before they're finalized. Leave blank to keep every claim single-approval
                  regardless of size.
                </p>
                <div className="flex items-center gap-2 max-w-xs">
                  <span className="text-xs text-muted-foreground font-semibold">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="No second approval required"
                    value={expenseSecondApprovalThreshold}
                    onChange={(e) => setExpenseSecondApprovalThreshold(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-card dark:bg-card text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Single Sign-On (Google)</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    orgSettingsData?.ssoGoogleUsingDemoCredentials
                      ? 'bg-amber-500/10 text-amber-600'
                      : orgSettingsData?.ssoGoogleAvailable
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-secondary dark:bg-card text-muted-foreground'
                  }`}>
                    {orgSettingsData?.ssoGoogleUsingDemoCredentials ? 'Demo Credentials' : orgSettingsData?.ssoGoogleAvailable ? 'Active' : 'Not Configured'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
                  Lets employees sign in with their Google account instead of a password. Requires
                  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI to be set on the server —
                  that part is infra-level config, not editable here. This toggle lets you turn it off for the
                  workspace even when the server has it configured.
                </p>
                {orgSettingsData?.ssoGoogleUsingDemoCredentials && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-normal">
                      <strong>This is still using the template's shared demo Google credentials.</strong> "Continue
                      with Google" will show up but won't actually work for your users. Create your own OAuth
                      Client ID in Google Cloud Console and set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET on the
                      server to fix this.
                    </p>
                  </div>
                )}
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

              <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b pb-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Attendance & Leave Policy</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Late Grace Period (minutes)</label>
                    <input type="number" min={0} max={240} value={lateGraceMinutes}
                      onChange={(e) => setLateGraceMinutes(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Half-Day Threshold (hours worked)</label>
                    <input type="number" min={0} max={24} step={0.5} value={halfDayThresholdHours}
                      onChange={(e) => setHalfDayThresholdHours(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  A clock-in past the grace period is marked Late; a day with fewer worked hours than the threshold is marked Half-Day.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Weekly Off Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_LABELS.map((label, dayIndex) => {
                      const isOff = weeklyOffDays.includes(dayIndex);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setWeeklyOffDays((prev) => (isOff ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]))}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-colors ${isOff ? 'bg-primary text-primary-foreground border-primary' : 'bg-card dark:bg-card text-muted-foreground border-border'}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Leave Accrual Policy</label>
                  <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-[9px] uppercase tracking-wider text-muted-foreground font-bold px-0.5">
                    <span>Leave Type</span><span>Annual Total (days)</span><span>Accrued / Month</span>
                  </div>
                  {Object.entries(leaveAccrualPolicy).map(([leaveType, entry]) => (
                    <div key={leaveType} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center">
                      <span className="text-xs font-bold text-foreground">{leaveType}</span>
                      <input type="number" min={0} step={0.5} value={entry.annualTotal}
                        onChange={(e) => setLeaveAccrualPolicy((p) => ({ ...p, [leaveType]: { ...p[leaveType], annualTotal: Number(e.target.value) || 0 } }))}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                      <input type="number" min={0} step={0.01} value={Math.round(entry.monthlyRate * 100) / 100}
                        onChange={(e) => setLeaveAccrualPolicy((p) => ({ ...p, [leaveType]: { ...p[leaveType], monthlyRate: Number(e.target.value) || 0 } }))}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                    </div>
                  ))}
                  <p className="text-[9px] text-muted-foreground">
                    A rate of 0 grants the full annual total immediately (appropriate for a type like Unpaid, which isn't an earned benefit that builds up over time) instead of accruing month by month.
                  </p>
                </div>
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Overtime Pay</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={overtimePolicy.enabled}
                    aria-label="Enable overtime pay"
                    onClick={() => setOvertimePolicy((p) => ({ ...p, enabled: !p.enabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${overtimePolicy.enabled ? 'bg-primary' : 'bg-secondary dark:bg-card'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${overtimePolicy.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
                  Hours worked beyond the daily threshold on a clocked-out day are paid at a multiple of the derived
                  hourly rate (basic salary ÷ working days ÷ threshold hours). Surfaces in HR → Payslips and is
                  automatically included in bulk-generated payslips; folded in as a suggestion for the Admin to
                  review on individually-generated ones.
                </p>
                {overtimePolicy.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Daily Threshold (hours)</label>
                      <input type="number" min={0.5} max={24} step={0.5} value={overtimePolicy.dailyThresholdHours}
                        onChange={(e) => setOvertimePolicy((p) => ({ ...p, dailyThresholdHours: Number(e.target.value) || 0 }))}
                        className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Rate Multiplier</label>
                      <input type="number" min={1} max={10} step={0.1} value={overtimePolicy.rateMultiplier}
                        onChange={(e) => setOvertimePolicy((p) => ({ ...p, rateMultiplier: Number(e.target.value) || 1 }))}
                        className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b pb-2">
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Payroll Automation — Statutory Deductions</span>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
                  Optional deductions automatically factored into every payslip's suggested figures in HR → Payslips.
                  Everything below starts disabled — turn on only what actually applies to your jurisdiction, and
                  verify rates/slabs against current local law or your accountant. The income tax figure in
                  particular is a simplified estimate, not a certified tax calculation.
                </p>

                {/* Provident Fund */}
                <div className="rounded-xl border p-4 space-y-3 bg-card dark:bg-card/60">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Provident Fund</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={statutoryPolicy.providentFund.enabled}
                      onClick={() => setStatutoryPolicy((p) => ({ ...p, providentFund: { ...p.providentFund, enabled: !p.providentFund.enabled } }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${statutoryPolicy.providentFund.enabled ? 'bg-primary' : 'bg-secondary dark:bg-card'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${statutoryPolicy.providentFund.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {statutoryPolicy.providentFund.enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Employee Rate (%)</label>
                        <input
                          type="number" min={0} max={100} step={0.5}
                          value={statutoryPolicy.providentFund.employeeRatePercent}
                          onChange={(e) => setStatutoryPolicy((p) => ({ ...p, providentFund: { ...p.providentFund, employeeRatePercent: Number(e.target.value) || 0 } }))}
                          className="w-full px-3 py-1.5 border rounded-lg bg-muted dark:bg-card text-xs font-bold focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Wage Ceiling (blank = none)</label>
                        <input
                          type="number" min={0} placeholder="No cap"
                          value={statutoryPolicy.providentFund.wageCeiling ?? ''}
                          onChange={(e) => setStatutoryPolicy((p) => ({ ...p, providentFund: { ...p.providentFund, wageCeiling: e.target.value === '' ? null : Number(e.target.value) } }))}
                          className="w-full px-3 py-1.5 border rounded-lg bg-muted dark:bg-card text-xs font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Professional Tax */}
                <div className="rounded-xl border p-4 space-y-3 bg-card dark:bg-card/60">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Professional Tax</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={statutoryPolicy.professionalTax.enabled}
                      onClick={() => setStatutoryPolicy((p) => ({ ...p, professionalTax: { ...p.professionalTax, enabled: !p.professionalTax.enabled } }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${statutoryPolicy.professionalTax.enabled ? 'bg-primary' : 'bg-secondary dark:bg-card'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${statutoryPolicy.professionalTax.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {statutoryPolicy.professionalTax.enabled && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[9px] uppercase tracking-wider text-muted-foreground font-bold px-0.5">
                        <span>Min Gross</span><span>Max Gross</span><span>Monthly Amount</span><span />
                      </div>
                      {statutoryPolicy.professionalTax.slabs.map((slab, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                          <input type="number" min={0} value={slab.minGross}
                            onChange={(e) => setStatutoryPolicy((p) => ({ ...p, professionalTax: { ...p.professionalTax, slabs: p.professionalTax.slabs.map((s, idx) => idx === i ? { ...s, minGross: Number(e.target.value) || 0 } : s) } }))}
                            className="w-full px-2.5 py-1.5 border rounded-lg bg-muted dark:bg-card text-xs font-bold focus:outline-none" />
                          <input type="number" min={0} placeholder="No limit" value={slab.maxGross ?? ''}
                            onChange={(e) => setStatutoryPolicy((p) => ({ ...p, professionalTax: { ...p.professionalTax, slabs: p.professionalTax.slabs.map((s, idx) => idx === i ? { ...s, maxGross: e.target.value === '' ? null : Number(e.target.value) } : s) } }))}
                            className="w-full px-2.5 py-1.5 border rounded-lg bg-muted dark:bg-card text-xs font-bold focus:outline-none" />
                          <input type="number" min={0} value={slab.amount}
                            onChange={(e) => setStatutoryPolicy((p) => ({ ...p, professionalTax: { ...p.professionalTax, slabs: p.professionalTax.slabs.map((s, idx) => idx === i ? { ...s, amount: Number(e.target.value) || 0 } : s) } }))}
                            className="w-full px-2.5 py-1.5 border rounded-lg bg-muted dark:bg-card text-xs font-bold focus:outline-none" />
                          <button type="button" onClick={() => setStatutoryPolicy((p) => ({ ...p, professionalTax: { ...p.professionalTax, slabs: p.professionalTax.slabs.filter((_, idx) => idx !== i) } }))}
                            className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setStatutoryPolicy((p) => ({ ...p, professionalTax: { ...p.professionalTax, slabs: [...p.professionalTax.slabs, { minGross: 0, maxGross: null, amount: 0 }] } }))}
                        className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline pt-0.5">
                        <Plus className="h-3 w-3" /> Add Slab
                      </button>
                    </div>
                  )}
                </div>

                {/* Income Tax */}
                <div className="rounded-xl border p-4 space-y-3 bg-card dark:bg-card/60">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Income Tax (Simplified Estimate)</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={statutoryPolicy.incomeTax.enabled}
                      onClick={() => setStatutoryPolicy((p) => ({ ...p, incomeTax: { ...p.incomeTax, enabled: !p.incomeTax.enabled } }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${statutoryPolicy.incomeTax.enabled ? 'bg-primary' : 'bg-secondary dark:bg-card'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${statutoryPolicy.incomeTax.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {statutoryPolicy.incomeTax.enabled && (
                    <div className="space-y-3">
                      <div className="space-y-1 max-w-xs">
                        <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Standard Deduction (Annual)</label>
                        <input type="number" min={0} value={statutoryPolicy.incomeTax.standardDeductionAnnual}
                          onChange={(e) => setStatutoryPolicy((p) => ({ ...p, incomeTax: { ...p.incomeTax, standardDeductionAnnual: Number(e.target.value) || 0 } }))}
                          className="w-full px-3 py-1.5 border rounded-lg bg-muted dark:bg-card text-xs font-bold focus:outline-none" />
                      </div>
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[9px] uppercase tracking-wider text-muted-foreground font-bold px-0.5">
                        <span>Taxable Up To (Annual)</span><span>Rate (%)</span><span />
                      </div>
                      {statutoryPolicy.incomeTax.annualSlabs.map((slab, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                          <input type="number" min={0} placeholder="No limit (top slab)" value={slab.upToAnnual ?? ''}
                            onChange={(e) => setStatutoryPolicy((p) => ({ ...p, incomeTax: { ...p.incomeTax, annualSlabs: p.incomeTax.annualSlabs.map((s, idx) => idx === i ? { ...s, upToAnnual: e.target.value === '' ? null : Number(e.target.value) } : s) } }))}
                            className="w-full px-2.5 py-1.5 border rounded-lg bg-muted dark:bg-card text-xs font-bold focus:outline-none" />
                          <input type="number" min={0} max={100} value={slab.ratePercent}
                            onChange={(e) => setStatutoryPolicy((p) => ({ ...p, incomeTax: { ...p.incomeTax, annualSlabs: p.incomeTax.annualSlabs.map((s, idx) => idx === i ? { ...s, ratePercent: Number(e.target.value) || 0 } : s) } }))}
                            className="w-full px-2.5 py-1.5 border rounded-lg bg-muted dark:bg-card text-xs font-bold focus:outline-none" />
                          <button type="button" onClick={() => setStatutoryPolicy((p) => ({ ...p, incomeTax: { ...p.incomeTax, annualSlabs: p.incomeTax.annualSlabs.filter((_, idx) => idx !== i) } }))}
                            className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setStatutoryPolicy((p) => ({ ...p, incomeTax: { ...p.incomeTax, annualSlabs: [...p.incomeTax.annualSlabs, { upToAnnual: null, ratePercent: 0 }] } }))}
                        className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline pt-0.5">
                        <Plus className="h-3 w-3" /> Add Slab
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Attendance Anomaly Detection</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={anomalyPolicy.enabled}
                    aria-label="Enable attendance anomaly detection"
                    onClick={() => setAnomalyPolicy((p) => ({ ...p, enabled: !p.enabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${anomalyPolicy.enabled ? 'bg-primary' : 'bg-secondary dark:bg-card'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${anomalyPolicy.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
                  Flags an employee's month for review — no money involved, just a heads-up — when their attendance
                  crosses the thresholds below. Surfaces automatically in HR → Payslips (both the single and bulk
                  generate flows) and can trigger a Workflow rule (see Workflows → "When an Attendance Anomaly is
                  Detected").
                </p>
                {anomalyPolicy.enabled && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Max Absences</label>
                      <input type="number" min={0} value={anomalyPolicy.maxAbsentDays}
                        onChange={(e) => setAnomalyPolicy((p) => ({ ...p, maxAbsentDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Max Late Days</label>
                      <input type="number" min={0} value={anomalyPolicy.maxLateDays}
                        onChange={(e) => setAnomalyPolicy((p) => ({ ...p, maxLateDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Max Half-Days</label>
                      <input type="number" min={0} value={anomalyPolicy.maxHalfDays}
                        onChange={(e) => setAnomalyPolicy((p) => ({ ...p, maxHalfDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Max Unpaid Leave</label>
                      <input type="number" min={0} value={anomalyPolicy.maxUnpaidLeaveDays}
                        onChange={(e) => setAnomalyPolicy((p) => ({ ...p, maxUnpaidLeaveDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 border rounded-2xl p-5 bg-muted/40 dark:bg-card/30">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Attendance Geofencing</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={geofencePolicy.enabled}
                    aria-label="Enable attendance geofencing"
                    onClick={() => setGeofencePolicy((p) => ({ ...p, enabled: !p.enabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${geofencePolicy.enabled ? 'bg-primary' : 'bg-secondary dark:bg-card'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${geofencePolicy.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
                  Checks each clock-in's GPS coordinates against your office location. By default this only records
                  whether someone was in range (visible on their attendance log) without stopping anyone from
                  clocking in — turn on "Block out-of-range clock-ins" below only once you're confident the radius
                  is right, since GPS accuracy varies by device and a legitimate remote day will otherwise be
                  rejected.
                </p>
                {geofencePolicy.enabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Office Latitude</label>
                        <input type="number" step="any" placeholder="e.g. 12.9716" value={geofencePolicy.officeLatitude ?? ''}
                          onChange={(e) => setGeofencePolicy((p) => ({ ...p, officeLatitude: e.target.value === '' ? null : Number(e.target.value) }))}
                          className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Office Longitude</label>
                        <input type="number" step="any" placeholder="e.g. 77.5946" value={geofencePolicy.officeLongitude ?? ''}
                          onChange={(e) => setGeofencePolicy((p) => ({ ...p, officeLongitude: e.target.value === '' ? null : Number(e.target.value) }))}
                          className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={geofenceLocating}
                      onClick={async () => {
                        setGeofenceLocating(true);
                        const coords = await getBrowserCoordinates(8000);
                        setGeofenceLocating(false);
                        if (!coords) {
                          toast.error('Could not get your current location. Enter coordinates manually instead.');
                          return;
                        }
                        setGeofencePolicy((p) => ({ ...p, officeLatitude: coords.latitude, officeLongitude: coords.longitude }));
                      }}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline disabled:opacity-50"
                    >
                      {geofenceLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                      Use my current location
                    </button>
                    <div className="space-y-1 max-w-xs">
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Radius (meters)</label>
                      <input type="number" min={1} value={geofencePolicy.radiusMeters}
                        onChange={(e) => setGeofencePolicy((p) => ({ ...p, radiusMeters: Math.max(1, Number(e.target.value) || 1) }))}
                        className="w-full px-3 py-1.5 border rounded-lg bg-card dark:bg-card text-xs font-bold focus:outline-none" />
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-foreground pt-1">
                      <input type="checkbox" checked={geofencePolicy.enforceBlock}
                        onChange={(e) => setGeofencePolicy((p) => ({ ...p, enforceBlock: e.target.checked }))}
                        className="h-4 w-4 rounded border-input" />
                      Block out-of-range clock-ins (instead of just recording them)
                    </label>
                  </div>
                )}
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
      </div>
    </div>
  );
}
