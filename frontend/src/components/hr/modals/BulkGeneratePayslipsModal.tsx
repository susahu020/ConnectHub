import React, { useState } from 'react';
import { X, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface BulkGenerateResult {
  generated: Array<{ employeeId: string; payslipId: string; netSalary: number }>;
  skippedExisting: string[];
  failed: Array<{ employeeId: string; error: string }>;
  flagged: Array<{ employeeId: string; firstName: string; lastName: string; anomalies: Array<{ type: string; message: string }> }>;
  totalTargeted: number;
}

export function BulkGeneratePayslipsModal({
  open,
  onClose,
  isPending,
  onSubmit,
  result,
}: {
  open: boolean;
  onClose: () => void;
  isPending: boolean;
  onSubmit: (month: number, year: number) => void;
  result: BulkGenerateResult | null;
}) {
  const { t } = useTranslation();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="flex items-center gap-2 text-base font-black text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('hr.payslips.bulkGenerateTitle')}
          </h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted dark:hover:bg-card rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{t('hr.payslips.bulkGenerateDescription')}</p>

        {!result && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString([], { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || now.getFullYear())}
                  className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => onSubmit(month, year)}
              disabled={isPending}
              className="w-full py-2.5 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:bg-primary-dark transition-all disabled:opacity-60"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? t('hr.payslips.bulkGenerating') : t('hr.payslips.bulkGenerateConfirm')}
            </button>
          </>
        )}

        {result && (
          <div className="space-y-3">
            {result.totalTargeted === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t('hr.payslips.bulkGenerateEmpty')}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
                    <p className="text-lg font-black text-green-600">{result.generated.length}</p>
                    <p className="text-[9px] font-bold uppercase text-green-600/80">Generated</p>
                  </div>
                  <div className="rounded-xl bg-muted dark:bg-card/50 border border-border p-3">
                    <p className="text-lg font-black text-foreground">{result.skippedExisting.length}</p>
                    <p className="text-[9px] font-bold uppercase text-muted-foreground">Skipped</p>
                  </div>
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3">
                    <p className="text-lg font-black text-rose-600">{result.failed.length}</p>
                    <p className="text-[9px] font-bold uppercase text-rose-600/80">Failed</p>
                  </div>
                </div>
                {result.failed.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-xl bg-rose-500/5 border border-rose-500/10 p-2.5 space-y-1">
                    {result.failed.map((f) => (
                      <p key={f.employeeId} className="text-[10px] text-rose-600">
                        {f.employeeId}: {f.error}
                      </p>
                    ))}
                  </div>
                )}
                {result.flagged && result.flagged.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-xl bg-orange-500/5 border border-orange-500/20 p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      {result.flagged.length} flagged for attendance review
                    </div>
                    {result.flagged.map((f) => (
                      <div key={f.employeeId} className="text-[10px] text-orange-700 dark:text-orange-400">
                        <span className="font-bold">{f.firstName} {f.lastName}:</span>{' '}
                        {f.anomalies.map((a) => a.message).join(' ')}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-muted dark:bg-card border text-foreground text-xs font-black rounded-xl hover:bg-muted/70 transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
