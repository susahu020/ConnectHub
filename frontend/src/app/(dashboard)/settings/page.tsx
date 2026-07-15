'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  Lock, 
  Smartphone, 
  Bell, 
  Trash2, 
  Loader2, 
  Laptop, 
  Globe,
  ShieldCheck,
  ShieldAlert,
  Copy,
  X
} from 'lucide-react';
import { api } from '../../../services/api';
import { useTheme } from 'next-themes';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { setTheme: setActiveTheme } = useTheme();

  // Password edit state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Settings preferences state
  const [theme, setTheme] = useState(user?.settings?.theme || 'system');
  const [language, setLanguage] = useState(user?.settings?.language || 'en');
  const [pushEnabled, setPushEnabled] = useState(user?.settings?.pushEnabled ?? true);
  const [emailEnabled, setEmailEnabled] = useState(user?.settings?.emailEnabled ?? true);
  const [desktopEnabled, setDesktopEnabled] = useState(user?.settings?.desktopEnabled ?? true);

  // 2FA management state
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState<any>(null); // { secret, qrCodeUrl }
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableToken, setDisableToken] = useState('');
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // Fetch active sessions
  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: () => api.getSessions(),
  });

  const handleUpdateSettings = async () => {
    try {
      const response = await api.updateSettings({
        theme,
        language,
        pushEnabled,
        emailEnabled,
        desktopEnabled,
      });
      // Sync client side Zustand store
      updateUser({ settings: response.settings });
      toast.success('Preferences updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings.');
    }
  };

  // Run settings updates automatically when values shift
  useEffect(() => {
    if (user) {
      handleUpdateSettings();
      if (theme) {
        setActiveTheme(theme);
      }
    }
  }, [theme, language, pushEnabled, emailEnabled, desktopEnabled]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Incorrect current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleInit2FA = async () => {
    try {
      const response = await api.setup2FA();
      setTwoFactorSetupData(response);
      setTwoFactorOpen(true);
      setBackupCodes([]);
      setTwoFactorToken('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize 2FA setup.');
    }
  };

  const handleActivate2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken) return;
    setEnabling(true);
    try {
      const response = await api.activate2FA(twoFactorToken);
      setBackupCodes(response.backupCodes);
      updateUser({ twoFactorEnabled: true } as any);
      toast.success('2FA successfully enabled!');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Incorrect TOTP token.');
    } finally {
      setEnabling(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableToken) return;
    setDisabling(true);
    try {
      await api.disable2FA(disableToken);
      updateUser({ twoFactorEnabled: false } as any);
      setDisableToken('');
      toast.success('2FA successfully disabled.');
    } catch (err: any) {
      toast.error(err.message || 'Incorrect verification code.');
    } finally {
      setDisabling(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    if (!await confirm({
      title: 'Revoke Session',
      message: 'Revoke this session? This will force-logout the device.',
      confirmText: 'Revoke Session',
      type: 'danger'
    })) return;
    try {
      await api.deleteSession(id);
      refetchSessions();
      toast.success('Session revoked.');
    } catch (err) {
      toast.error('Failed to revoke session.');
    }
  };

  const handleLogoutOtherDevices = async () => {
    if (!await confirm({
      title: 'Log Out Other Devices',
      message: 'Are you sure you want to log out all other active devices?',
      confirmText: 'Log Out Others',
      type: 'danger'
    })) return;
    try {
      await api.logoutAll();
      refetchSessions();
      toast.success('All other devices have been logged out.');
    } catch (err) {
      toast.error('Failed to log out of other devices.');
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!await confirm({
      title: 'Log Out All Devices',
      message: 'Log out of all sessions (including the current one)?',
      confirmText: 'Log Out All',
      type: 'danger'
    })) return;
    try {
      await api.logout();
      useAuthStore.getState().logout();
      toast.success('Successfully logged out of all devices.');
      window.location.href = '/login';
    } catch (err) {
      toast.error('Failed to terminate all sessions.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">System Preferences</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize UI appearances, notification triggers, active sessions, and passwords.</p>
      </div>

      {/* Account Profile Summary Overview Banner */}
      {user && (
        <div className="bg-white dark:bg-slate-900 border p-5 rounded-3xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 border rounded-full flex items-center justify-center text-xl font-extrabold uppercase text-slate-500 overflow-hidden shrink-0 shadow-2xs">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                `${user.firstName[0]}${user.lastName[0]}`
              )}
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base leading-none text-slate-850 dark:text-slate-200">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-xs text-slate-400 font-semibold leading-none">
                {user.designation || 'Company Teammate'} • {user.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-2 py-0.5 bg-primary/5 text-primary border border-primary/10 rounded-full text-[9px] font-black uppercase tracking-wider">
                  Role: {user.role}
                </span>
                {(user as any).department && (
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-900/30 rounded-full text-[9px] font-black uppercase tracking-wider">
                    {(user as any).department.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 font-extrabold text-[9px] px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-900/30 uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>✓ Verified Account</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Left Column: UI Prefs & Password */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Preferences Card */}
          <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b pb-3 flex items-center space-x-2">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-sm">UI Settings & Theme</h3>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="uppercase text-[9px] tracking-wider">Interface Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-foreground focus:outline-none"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="system">System Default</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="uppercase text-[9px] tracking-wider">System Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-foreground focus:outline-none"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>

              {/* Notification Toggles */}
              <div className="space-y-3 pt-3 border-t">
                <h4 className="uppercase text-[9px] tracking-wider text-slate-400">Alert Channels</h4>
                
                <label className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
                  <span className="text-xs text-foreground font-semibold">Enable Real-Time Sockets Push Notifications</span>
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    onChange={() => setPushEnabled(!pushEnabled)}
                    className="rounded text-primary focus:ring-primary/25 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
                  <span className="text-xs text-foreground font-semibold">Receive Email digests and alerts</span>
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={() => setEmailEnabled(!emailEnabled)}
                    className="rounded text-primary focus:ring-primary/25 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
                  <span className="text-xs text-foreground font-semibold">Receive local desktop popup alert banners</span>
                  <input
                    type="checkbox"
                    checked={desktopEnabled}
                    onChange={() => setDesktopEnabled(!desktopEnabled)}
                    className="rounded text-primary focus:ring-primary/25 h-4 w-4"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Password Card */}
          <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b pb-3 flex items-center space-x-2">
              <Lock className="h-5 w-5 text-indigo-500" />
              <h3 className="font-bold text-sm">Security & Password</h3>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[9px] tracking-wider">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 bg-primary text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow"
              >
                {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Update Password</span>
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication Card */}
          <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="font-bold text-sm">Two-Factor Authentication (2FA)</h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                (user as any)?.twoFactorEnabled 
                  ? 'text-emerald-500 bg-emerald-50 border-emerald-200' 
                  : 'text-slate-400 bg-slate-50 border-slate-200'
              }`}>
                {(user as any)?.twoFactorEnabled ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="space-y-3 text-xs leading-normal">
              <p className="text-slate-550 dark:text-slate-400">
                Enhance your account safety by requesting a temporary code from an authenticator app (like Authy or Google Authenticator) every time you login.
              </p>

              {(user as any)?.twoFactorEnabled ? (
                /* 2FA Enabled view: Allow disabling */
                <form onSubmit={handleDisable2FA} className="pt-3 border-t space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-405 font-bold uppercase">Enter Auth Token to disable</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 123456"
                        value={disableToken}
                        onChange={(e) => setDisableToken(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none font-mono"
                      />
                      <button
                        type="submit"
                        disabled={disabling}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold shadow hover:bg-red-600 disabled:opacity-50"
                      >
                        {disabling ? 'Disabling...' : 'Disable 2FA'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* 2FA Disabled view: Allow enabling */
                <div className="pt-2">
                  <button
                    onClick={handleInit2FA}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow hover:bg-primary/95 flex items-center space-x-1.5"
                  >
                    <span>Enable 2FA Protection</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Sessions List */}
        <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl shadow-sm space-y-5">
          <div className="border-b pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-sm">Active Sessions</h3>
            </div>
          </div>

          {/* Bulk revokes */}
          {sessions && sessions.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pb-2">
              <button
                onClick={handleLogoutOtherDevices}
                className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-350 rounded-xl text-[10px] font-bold transition-all shadow-xs"
              >
                Logout Others
              </button>
              <button
                onClick={handleLogoutAllDevices}
                className="py-2 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-bold transition-all"
              >
                Logout All Devices
              </button>
            </div>
          )}

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {sessions?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No active sessions tracked.</p>
            ) : (
              sessions?.map((sess: any) => (
                <div 
                  key={sess.id} 
                  className={`p-3.5 border rounded-xl transition-all flex flex-col space-y-2 text-[10px] relative overflow-hidden ${
                    sess.isCurrent 
                      ? 'border-emerald-500/30 bg-emerald-500/5' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {sess.isCurrent && (
                    <span className="absolute right-3 top-3 bg-emerald-500 text-white font-extrabold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                      Current
                    </span>
                  )}
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5 font-bold">
                        <Laptop className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{sess.deviceName || 'Web Browser'}</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 leading-normal space-y-0.5">
                        <p><strong>System:</strong> {sess.operatingSystem || 'Unknown OS'} • {sess.browser || 'Unknown'}</p>
                        <p><strong>IP:</strong> {sess.ipAddress || 'Unknown'}</p>
                        <p><strong>Location:</strong> {sess.location || 'Local Network'}</p>
                      </div>
                    </div>
                    {!sess.isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded shrink-0 self-start"
                        title="Revoke session"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-[8px] text-slate-400 pt-1.5 border-t border-dashed">
                    <span>Logged: {new Date(sess.loginTime || sess.createdAt).toLocaleDateString()}</span>
                    <span>Active: {new Date(sess.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 2FA Setup Walkthrough Modal */}
      {twoFactorOpen && twoFactorSetupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative animate-in fade-in duration-200">
            <button
              onClick={() => setTwoFactorOpen(false)}
              className="absolute right-4 top-4 text-slate-550 hover:bg-slate-100 p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-bold text-base">Setup Authenticator App</h3>
              <p className="text-xs text-slate-400">Follow these steps to activate 2FA protection.</p>
            </div>

            {backupCodes.length > 0 ? (
              /* Show Backup recovery codes on completion */
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center space-x-2 text-emerald-500">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-[10px] font-black uppercase">✓ 2FA Activated Successfully</span>
                </div>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-normal">
                  Save these backup codes in a safe place. If you ever lose your authenticator device, you can use these to recover access:
                </p>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-mono text-center text-xs font-bold border">
                  {backupCodes.map((code) => (
                    <span key={code} className="select-all">{code}</span>
                  ))}
                </div>
                <button
                  onClick={() => setTwoFactorOpen(false)}
                  className="w-full py-2.5 bg-primary text-white rounded-xl font-bold"
                >
                  Finish Setup
                </button>
              </div>
            ) : (
              /* QR code verification steps */
              <form onSubmit={handleActivate2FA} className="space-y-4 text-xs font-semibold leading-normal">
                <div className="space-y-3">
                  <p className="text-slate-550 dark:text-slate-400">
                    1. Scan the QR code below using your authenticator app (Google Authenticator, Authy, etc.):
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 border rounded-2xl flex justify-center">
                    <img src={twoFactorSetupData.qrCodeUrl} alt="2FA QR Code" className="h-44 w-44 rounded-lg bg-white p-1" />
                  </div>
                  <p className="text-slate-550 dark:text-slate-400">
                    2. If you cannot scan the code, enter this key manually:
                  </p>
                  <div className="p-2 border rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-center select-all">
                    {twoFactorSetupData.secret}
                  </div>
                  <p className="text-slate-550 dark:text-slate-400">
                    3. Enter the 6-digit verification code generated by the app:
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={twoFactorToken}
                    onChange={(e) => setTwoFactorToken(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-center font-mono text-base tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enabling}
                  className="w-full py-2.5 bg-primary text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {enabling ? 'Verifying...' : 'Verify and Enable'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
