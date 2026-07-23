'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { useTheme } from 'next-themes';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';
import { AccountSummaryBanner } from '../../../components/settings/AccountSummaryBanner';
import { PreferencesCard } from '../../../components/settings/PreferencesCard';
import { PasswordCard } from '../../../components/settings/PasswordCard';
import { TwoFactorCard } from '../../../components/settings/TwoFactorCard';
import { ActiveSessionsPanel } from '../../../components/settings/ActiveSessionsPanel';
import { TwoFactorSetupModal } from '../../../components/settings/TwoFactorSetupModal';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
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
    if (
      !(await confirm({
        title: 'Revoke Session',
        message: 'Revoke this session? This will force-logout the device.',
        confirmText: 'Revoke Session',
        type: 'danger',
      }))
    )
      return;
    try {
      await api.deleteSession(id);
      refetchSessions();
      toast.success('Session revoked.');
    } catch (err) {
      toast.error('Failed to revoke session.');
    }
  };

  const handleLogoutOtherDevices = async () => {
    if (
      !(await confirm({
        title: 'Log Out Other Devices',
        message: 'Are you sure you want to log out all other active devices?',
        confirmText: 'Log Out Others',
        type: 'danger',
      }))
    )
      return;
    try {
      await api.logoutAll();
      refetchSessions();
      toast.success('All other devices have been logged out.');
    } catch (err) {
      toast.error('Failed to log out of other devices.');
    }
  };

  const handleLogoutAllDevices = async () => {
    if (
      !(await confirm({
        title: 'Log Out All Devices',
        message: 'Log out of all sessions (including the current one)?',
        confirmText: 'Log Out All',
        type: 'danger',
      }))
    )
      return;
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
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">System Preferences</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize UI appearances, notification triggers, active sessions, and passwords.</p>
      </div>

      <AccountSummaryBanner user={user} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-6">
          <PreferencesCard
            theme={theme}
            onThemeChange={setTheme}
            language={language}
            onLanguageChange={setLanguage}
            pushEnabled={pushEnabled}
            onPushEnabledChange={setPushEnabled}
            emailEnabled={emailEnabled}
            onEmailEnabledChange={setEmailEnabled}
            desktopEnabled={desktopEnabled}
            onDesktopEnabledChange={setDesktopEnabled}
          />

          <PasswordCard
            currentPassword={currentPassword}
            onCurrentPasswordChange={setCurrentPassword}
            newPassword={newPassword}
            onNewPasswordChange={setNewPassword}
            confirmPassword={confirmPassword}
            onConfirmPasswordChange={setConfirmPassword}
            loading={passwordLoading}
            onSubmit={handlePasswordChange}
          />

          <TwoFactorCard
            enabled={!!(user as any)?.twoFactorEnabled}
            disableToken={disableToken}
            onDisableTokenChange={setDisableToken}
            disabling={disabling}
            onDisableSubmit={handleDisable2FA}
            onInitSetup={handleInit2FA}
          />
        </div>

        <ActiveSessionsPanel
          sessions={sessions}
          onRevokeSession={handleRevokeSession}
          onLogoutOtherDevices={handleLogoutOtherDevices}
          onLogoutAllDevices={handleLogoutAllDevices}
        />
      </div>

      {twoFactorOpen && twoFactorSetupData && (
        <TwoFactorSetupModal
          setupData={twoFactorSetupData}
          token={twoFactorToken}
          onTokenChange={setTwoFactorToken}
          backupCodes={backupCodes}
          enabling={enabling}
          onSubmit={handleActivate2FA}
          onClose={() => setTwoFactorOpen(false)}
        />
      )}
    </div>
  );
}
