import React from 'react';
import { ShieldCheck, Download, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PrivacyDataCard({
  exportingData,
  onExportData,
  onOpenDeleteAccount,
}: {
  exportingData: boolean;
  onExportData: () => void;
  onOpenDeleteAccount: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-card dark:bg-card border p-6 rounded-2xl shadow-sm space-y-5">
      <div className="border-b pb-3 flex items-center space-x-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-sm">{t('settings.privacy.title')}</h3>
      </div>

      <div className="flex items-start justify-between gap-4 p-4 border rounded-xl bg-muted/40 dark:bg-card/30">
        <div>
          <p className="font-bold text-xs text-foreground">Export My Data</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal max-w-md">
            Download a copy of your profile, HR records, tasks, and content you&apos;ve authored as a JSON file.
          </p>
        </div>
        <button
          onClick={onExportData}
          disabled={exportingData}
          className="flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold hover:bg-muted dark:hover:bg-card disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {exportingData ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export Data
        </button>
      </div>

      <div className="flex items-start justify-between gap-4 p-4 border border-red-500/20 rounded-xl bg-red-500/5">
        <div>
          <p className="font-bold text-xs text-red-500">Delete My Account</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal max-w-md">
            Permanently deletes your account. This cannot be undone. Consider exporting your data first.
          </p>
        </div>
        <button
          onClick={onOpenDeleteAccount}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold whitespace-nowrap shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Account
        </button>
      </div>
    </div>
  );
}
