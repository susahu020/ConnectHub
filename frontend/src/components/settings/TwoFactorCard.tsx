import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function TwoFactorCard({
  enabled,
  disableToken,
  onDisableTokenChange,
  disabling,
  onDisableSubmit,
  onInitSetup,
}: {
  enabled: boolean;
  disableToken: string;
  onDisableTokenChange: (v: string) => void;
  disabling: boolean;
  onDisableSubmit: (e: React.FormEvent) => void;
  onInitSetup: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-card dark:bg-card border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="border-b pb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-sm">{t('settings.twoFactor.title')}</h3>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
            enabled ? 'text-emerald-500 bg-emerald-50 border-emerald-200' : 'text-muted-foreground bg-muted border-border'
          }`}
        >
          {enabled ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="space-y-3 text-xs leading-normal">
        <p className="text-muted-foreground dark:text-muted-foreground">
          Enhance your account safety by requesting a temporary code from an authenticator app (like Authy or Google Authenticator) every
          time you login.
        </p>

        {enabled ? (
          <form onSubmit={onDisableSubmit} className="pt-3 border-t space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-bold uppercase">Enter Auth Token to disable</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={disableToken}
                  onChange={(e) => onDisableTokenChange(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-xl bg-muted dark:bg-card focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={disabling}
                  className="px-4 py-2 bg-red-500 text-primary-foreground rounded-xl font-bold shadow hover:bg-red-600 disabled:opacity-50"
                >
                  {disabling ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="pt-2">
            <button
              onClick={onInitSetup}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow hover:bg-primary/95 flex items-center space-x-1.5"
            >
              <span>Enable 2FA Protection</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
