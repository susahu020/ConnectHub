import React from 'react';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../lib/i18n';

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
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="border-b pb-3 flex items-center space-x-2">
        <Settings className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-sm">{t('settings.preferences.title')}</h3>
      </div>

      <div className="space-y-4 text-xs font-semibold text-slate-500">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="uppercase text-[10px] tracking-wider">{t('settings.preferences.theme')}</label>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-foreground focus:outline-none"
            >
              <option value="light">{t('settings.preferences.themeLight')}</option>
              <option value="dark">{t('settings.preferences.themeDark')}</option>
              <option value="system">{t('settings.preferences.themeSystem')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="uppercase text-[10px] tracking-wider">{t('settings.preferences.language')}</label>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-foreground focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t">
          <h4 className="uppercase text-[10px] tracking-wider text-slate-400">{t('settings.preferences.alertChannels')}</h4>

          <label className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
            <span className="text-xs text-foreground font-semibold">{t('settings.preferences.pushLabel')}</span>
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={() => onPushEnabledChange(!pushEnabled)}
              className="rounded text-primary focus:ring-primary/25 h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
            <span className="text-xs text-foreground font-semibold">{t('settings.preferences.emailLabel')}</span>
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={() => onEmailEnabledChange(!emailEnabled)}
              className="rounded text-primary focus:ring-primary/25 h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
            <span className="text-xs text-foreground font-semibold">{t('settings.preferences.desktopLabel')}</span>
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
