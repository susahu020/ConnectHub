import React, { useState, useEffect } from 'react';
import { X, Loader2, Calculator, AlertTriangle } from 'lucide-react';
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
  //
  // On top of that, once an employee + month + year are all picked, this
  // also calls the payroll calculation preview (hr.controller.ts's
  // previewPayrollCalculation) — a real attendance/leave-aware suggestion
  // that supersedes the plain stored-salary prefill above with a
  // pro-rated figure (e.g. down-adjusted for unpaid absences that month).
  // It's still just a suggestion: every field stays editable, and the
  // server independently recomputes its own audit-trail copy on submit
  // rather than trusting whatever this preview showed.
  const now = new Date();
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [storedSalary, setStoredSalary] = useState<number | null>(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [basicSalaryValue, setBasicSalaryValue] = useState('');
  const [allowancesValue, setAllowancesValue] = useState('');
  const [deductionsValue, setDeductionsValue] = useState('');
  const [breakdown, setBreakdown] = useState<any | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmployeeId('');
      setStoredSalary(null);
      setBasicSalaryValue('');
      setAllowancesValue('');
      setDeductionsValue('');
      setBreakdown(null);
      setMonth(now.getMonth() + 1);
      setYear(now.getFullYear());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!employeeId || !month || !year) {
      setBreakdown(null);
      return;
    }
    let cancelled = false;
    setLoadingBreakdown(true);
    // Small debounce so retyping the year field doesn't fire a request
    // per keystroke.
    const timer = setTimeout(() => {
      api.previewPayrollCalculation(employeeId, month, year)
        .then((res: any) => {
          if (cancelled) return;
          setBreakdown(res);
          // IMPORTANT: basicSalary must stay the full contractual amount
          // and deductions carries the attendance-based reduction plus any
          // enabled statutory deductions (PF/Professional Tax/income-tax
          // estimate) separately — netSalary = basic + allowances -
          // deductions is computed server-side, so prefilling basicSalary
          // with the *already-prorated* suggestedBasicSalary while also
          // filling in deductions would subtract the absence amount twice.
          setBasicSalaryValue(String(res.baseSalary));
          const overtimePay = res.overtime?.totalOvertimePay || 0;
          const fixedAllowances = (res.hraAmount || 0) + (res.otherAllowancesAmount || 0);
          const totalAllowances = Math.round((overtimePay + fixedAllowances) * 100) / 100;
          setAllowancesValue(totalAllowances > 0 ? String(totalAllowances) : '');
          const statutoryTotal = res.statutorySuggestion?.totalStatutoryDeductions || 0;
          const combinedDeduction = res.suggestedDeduction + statutoryTotal;
          setDeductionsValue(combinedDeduction > 0 ? String(Math.round(combinedDeduction * 100) / 100) : '');
        })
        .catch(() => {
          if (!cancelled) setBreakdown(null);
        })
        .finally(() => {
          if (!cancelled) setLoadingBreakdown(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [employeeId, month, year]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
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
              <select
                name="month"
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
                name="year"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || now.getFullYear())}
                className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          {employeeId && (loadingBreakdown || breakdown) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary">
                <Calculator className="h-3 w-3" />
                Attendance-based calculation
                {loadingBreakdown && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
              </div>
              {breakdown && (
                <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
                  <div><span className="font-bold text-foreground">{breakdown.workingDays}</span> working days</div>
                  <div><span className="font-bold text-foreground">{breakdown.payableDays}</span> payable days</div>
                  <div><span className="font-bold text-foreground">{breakdown.presentDays}</span> present</div>
                  <div><span className="font-bold text-amber-600">{breakdown.lateDays}</span> late</div>
                  <div><span className="font-bold text-amber-600">{breakdown.halfDays}</span> half-day</div>
                  <div><span className="font-bold text-red-600">{breakdown.absentDays}</span> absent</div>
                  <div><span className="font-bold text-foreground">{breakdown.paidLeaveDays}</span> paid leave</div>
                  <div><span className="font-bold text-red-600">{breakdown.unpaidLeaveDays}</span> unpaid leave</div>
                </div>
              )}
              {breakdown?.overtime?.appliedRule && breakdown.overtime.totalOvertimeHours > 0 && (
                <div className="border-t border-primary/10 pt-2 space-y-1">
                  <div className="text-[9px] font-black uppercase tracking-wider text-primary/80">Overtime this month</div>
                  <div className="text-[10px] text-muted-foreground">
                    <span className="font-bold text-foreground">{breakdown.overtime.totalOvertimeHours}h</span> at{' '}
                    <span className="font-bold text-foreground">${breakdown.overtime.hourlyRate}/hr</span> ={' '}
                    <span className="font-bold text-foreground">${breakdown.overtime.totalOvertimePay}</span> — pre-filled into Allowances below
                  </div>
                </div>
              )}
              {((breakdown?.hraAmount || 0) + (breakdown?.otherAllowancesAmount || 0)) > 0 && (
                <div className="border-t border-primary/10 pt-2 space-y-1">
                  <div className="text-[9px] font-black uppercase tracking-wider text-primary/80">Fixed allowances on file</div>
                  <div className="grid grid-cols-2 gap-x-3 text-[10px] text-muted-foreground">
                    {(breakdown.hraAmount || 0) > 0 && <div>HRA: <span className="font-bold text-foreground">${breakdown.hraAmount}</span></div>}
                    {(breakdown.otherAllowancesAmount || 0) > 0 && <div>Other: <span className="font-bold text-foreground">${breakdown.otherAllowancesAmount}</span></div>}
                  </div>
                </div>
              )}
              {breakdown?.statutorySuggestion && (
                breakdown.statutorySuggestion.appliedRules.providentFund ||
                breakdown.statutorySuggestion.appliedRules.professionalTax ||
                breakdown.statutorySuggestion.appliedRules.incomeTax
              ) && (
                <div className="border-t border-primary/10 pt-2 space-y-1">
                  <div className="text-[9px] font-black uppercase tracking-wider text-primary/80">Estimated statutory deductions</div>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    {breakdown.statutorySuggestion.appliedRules.providentFund && (
                      <div><span className="font-bold text-foreground">${breakdown.statutorySuggestion.providentFundEmployee}</span> PF</div>
                    )}
                    {breakdown.statutorySuggestion.appliedRules.professionalTax && (
                      <div><span className="font-bold text-foreground">${breakdown.statutorySuggestion.professionalTax}</span> Prof. Tax</div>
                    )}
                    {breakdown.statutorySuggestion.appliedRules.incomeTax && (
                      <div><span className="font-bold text-foreground">${breakdown.statutorySuggestion.incomeTaxEstimateMonthly}</span> Est. Tax</div>
                    )}
                  </div>
                </div>
              )}
              <p className="text-[9px] text-muted-foreground/80 leading-snug">
                Deductions below were pre-filled from unpaid absences/leave{breakdown?.statutorySuggestion?.totalStatutoryDeductions ? ' and estimated statutory deductions' : ''} this month{(breakdown?.overtime?.totalOvertimePay || breakdown?.hraAmount || breakdown?.otherAllowancesAmount) ? '; Allowances were pre-filled from overtime and/or fixed allowances on file' : ''} — review and adjust as needed before generating.
              </p>
            </div>
          )}

          {breakdown?.anomalies && breakdown.anomalies.length > 0 && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-orange-600">
                <AlertTriangle className="h-3 w-3" />
                Attendance flagged for review
              </div>
              <ul className="space-y-1">
                {breakdown.anomalies.map((a: any) => (
                  <li key={a.type} className="text-[10px] text-orange-700 dark:text-orange-400">{a.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              <span>Basic Salary ($)</span>
              {loadingSalary && <Loader2 className="h-3 w-3 animate-spin" />}
              {!loadingSalary && employeeId && breakdown && (
                <span className="text-[9px] normal-case font-semibold text-primary">Employee's base salary</span>
              )}
              {!loadingSalary && employeeId && !breakdown && storedSalary != null && (
                <span className="text-[9px] normal-case font-semibold text-primary">Loaded from stored salary</span>
              )}
              {!loadingSalary && employeeId && !breakdown && storedSalary == null && (
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
              <input
                type="number" name="allowances" step="0.01" placeholder="0.00"
                value={allowancesValue}
                onChange={(e) => setAllowancesValue(e.target.value)}
                className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                <span>Deductions ($)</span>
                {breakdown && <span className="text-[9px] normal-case font-semibold text-primary">Suggested</span>}
              </label>
              <input
                type="number"
                name="deductions"
                step="0.01"
                placeholder="0.00"
                value={deductionsValue}
                onChange={(e) => setDeductionsValue(e.target.value)}
                className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
              />
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
