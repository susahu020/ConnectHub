import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../../../services/api';

const FLAG_STYLES: Record<string, string> = {
  PENDING_LEAVE_REQUESTS: 'text-blue-600',
  PENDING_REGULARIZATIONS: 'text-blue-600',
  NO_ATTENDANCE_RECORDED: 'text-rose-500',
  UNPAID_ABSENCES: 'text-amber-600',
  UNPAID_LEAVE: 'text-amber-600',
  ATTENDANCE_ANOMALY: 'text-orange-500',
  PAYSLIP_ALREADY_GENERATED: 'text-muted-foreground',
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function ReconciliationReportModal({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-payroll-reconciliation', month, year],
    queryFn: () => api.getPayrollReconciliationReport(month, year),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <div>
            <h3 className="text-base font-black text-foreground">Payroll Reconciliation Report</h3>
            <p className="text-[11px] text-muted-foreground">Review before finalizing this month's payroll — nothing here blocks generation.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 pb-3 flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg bg-muted dark:bg-card text-xs font-bold focus:outline-none"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())}
            className="w-24 px-3 py-2 border rounded-lg bg-muted dark:bg-card text-xs font-bold focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {isError && <p className="text-sm text-rose-500 text-center py-8">Failed to load the report.</p>}

          {data && (
            <>
              <p className="text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">{data.employeesWithFlags}</span> of{' '}
                <span className="font-bold text-foreground">{data.totalEmployees}</span> active employees have something worth a second look.
              </p>

              {data.rows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-bold text-foreground">Nothing flagged for this month.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.rows.map((row: any) => (
                    <div key={row.employeeId} className="border border-border rounded-xl p-4 space-y-1.5">
                      <p className="font-bold text-sm text-foreground">{row.firstName} {row.lastName}</p>
                      <ul className="space-y-1">
                        {row.flags.map((flag: any, i: number) => (
                          <li key={i} className={`flex items-start gap-1.5 text-[11px] ${FLAG_STYLES[flag.type] || 'text-muted-foreground'}`}>
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            {flag.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
