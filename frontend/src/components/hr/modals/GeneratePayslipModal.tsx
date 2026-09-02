import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../../services/api';

export function GeneratePayslipModal({
  open,
  onClose,
  employees,
  currentUserId,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  employees: any[];
  currentUserId?: string;
  isPending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  // Previously this form always started blank, meaning an Admin re-typed
  // the same basic salary from scratch every single pay cycle. Now it
  // looks up the employee's stored base salary (a dedicated, Admin-only
  // endpoint — see hr.controller.ts's getEmployeeBaseSalary) and
  // pre-fills the field the moment an employee is selected. Still fully
  // editable for a raise/bonus/one-off adjustment, and the "keep this as
  // their stored salary" checkbox (read via its name in page.tsx's
  // onSubmit, same pattern as every other field here) controls whether
  // this run's figure becomes next cycle's default.
  const [employeeId, setEmployeeId] = useState('');
  const [storedSalary, setStoredSalary] = useState<number | null>(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [basicSalaryValue, setBasicSalaryValue] = useState('');

  useEffect(() => {
    if (!open) {
      setEmployeeId('');
      setStoredSalary(null);
      setBasicSalaryValue('');
    }
  }, [open]);

  useEffect(() => {
    if (!employeeId) {
      setStoredSalary(null);
      setBasicSalaryValue('');
      return;
    }
    let cancelled = false;
    setLoadingSalary(true);
    api.getEmployeeBaseSalary(employeeId)
      .then((res: any) => {
        if (cancelled) return;
        setStoredSalary(res.baseSalary);
        setBasicSalaryValue(res.baseSalary != null ? String(res.baseSalary) : '');
      })
      .catch(() => {
        if (!cancelled) setStoredSalary(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSalary(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-black text-foreground">Generate Employee Payslip</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted dark:hover:bg-card rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Select Employee</label>
            <select
              name="employeeId"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
            >
              <option value="">— Select Employee —</option>
              {employees
                .filter((emp: any) => emp.id !== currentUserId)
                .map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.designation || 'Staff'})
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Month</label>
              <select name="month" className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString([], { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Year</label>
              <input type="number" name="year" defaultValue={new Date().getFullYear()} className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              <span>Basic Salary ($)</span>
              {loadingSalary && <Loader2 className="h-3 w-3 animate-spin" />}
              {!loadingSalary && employeeId && storedSalary != null && (
                <span className="text-[9px] normal-case font-semibold text-primary">Loaded from stored salary</span>
              )}
              {!loadingSalary && employeeId && storedSalary == null && (
                <span className="text-[9px] normal-case font-semibold text-amber-600">No stored salary yet</span>
              )}
            </label>
            <input
              type="number"
              name="basicSalary"
              step="0.01"
              required
              placeholder="0.00"
              value={basicSalaryValue}
              onChange={(e) => setBasicSalaryValue(e.target.value)}
              className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Allowances ($)</label>
              <input type="number" name="allowances" step="0.01" placeholder="0.00" className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Deductions ($)</label>
              <input type="number" name="deductions" step="0.01" placeholder="0.00" className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</label>
            <textarea name="notes" rows={2} placeholder="Add comments or notes..." className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
          </div>
          <label className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
            <input type="checkbox" name="updateStoredSalary" defaultChecked className="h-3.5 w-3.5" />
            Save this basic salary as {employeeId ? "this employee's" : "the employee's"} stored salary for next time
          </label>
          <button type="submit" disabled={isPending} className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:bg-primary-dark transition-all">
            {isPending ? 'Generating...' : 'Generate Payslip'}
          </button>
        </form>
      </div>
    </div>
  );
}
