import React from 'react';
import { ShieldCheck } from 'lucide-react';

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
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="border-b pb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-sm">Two-Factor Authentication (2FA)</h3>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
            enabled ? 'text-emerald-500 bg-emerald-50 border-emerald-200' : 'text-slate-400 bg-slate-50 border-slate-200'
          }`}
        >
          {enabled ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="space-y-3 text-xs leading-normal">
        <p className="text-slate-550 dark:text-slate-400">
          Enhance your account safety by requesting a temporary code from an authenticator app (like Authy or Google Authenticator) every
          time you login.
        </p>

        {enabled ? (
          <form onSubmit={onDisableSubmit} className="pt-3 border-t space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-405 font-bold uppercase">Enter Auth Token to disable</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={disableToken}
                  onChange={(e) => onDisableTokenChange(e.target.value)}
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
          <div className="pt-2">
            <button
              onClick={onInitSetup}
              className="px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow hover:bg-primary/95 flex items-center space-x-1.5"
            >
              <span>Enable 2FA Protection</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
