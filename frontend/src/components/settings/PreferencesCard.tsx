import React from 'react';
import { Settings } from 'lucide-react';

export function PreferencesCard({
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  pushEnabled,
  onPushEnabledChange,
  emailEnabled,
  onEmailEnabledChange,
  desktopEnabled,
  onDesktopEnabledChange,
}: {
  theme: string;
  onThemeChange: (v: string) => void;
  language: string;
  onLanguageChange: (v: string) => void;
  pushEnabled: boolean;
  onPushEnabledChange: (v: boolean) => void;
  emailEnabled: boolean;
  onEmailEnabledChange: (v: boolean) => void;
  desktopEnabled: boolean;
  onDesktopEnabledChange: (v: boolean) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="border-b pb-3 flex items-center space-x-2">
        <Settings className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-sm">UI Settings & Theme</h3>
      </div>

      <div className="space-y-4 text-xs font-semibold text-slate-500">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="uppercase text-[10px] tracking-wider">Interface Theme</label>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-foreground focus:outline-none"
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
              <option value="system">System Default</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="uppercase text-[10px] tracking-wider">System Language</label>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-foreground focus:outline-none"
            >
              <option value="en">English (US)</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t">
          <h4 className="uppercase text-[10px] tracking-wider text-slate-400">Alert Channels</h4>

          <label className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
            <span className="text-xs text-foreground font-semibold">Enable Real-Time Sockets Push Notifications</span>
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={() => onPushEnabledChange(!pushEnabled)}
              className="rounded text-primary focus:ring-primary/25 h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
            <span className="text-xs text-foreground font-semibold">Receive Email digests and alerts</span>
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={() => onEmailEnabledChange(!emailEnabled)}
              className="rounded text-primary focus:ring-primary/25 h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
            <span className="text-xs text-foreground font-semibold">Receive local desktop popup alert banners</span>
            <input
              type="checkbox"
              checked={desktopEnabled}
              onChange={() => onDesktopEnabledChange(!desktopEnabled)}
              className="rounded text-primary focus:ring-primary/25 h-4 w-4"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
