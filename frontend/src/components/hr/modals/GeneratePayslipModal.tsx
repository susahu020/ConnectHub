import React from 'react';
import { X } from 'lucide-react';

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
            <select name="employeeId" required className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
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
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Basic Salary ($)</label>
            <input type="number" name="basicSalary" step="0.01" required placeholder="0.00" className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
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
          <button type="submit" disabled={isPending} className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:bg-primary-dark transition-all">
            {isPending ? 'Generating...' : 'Generate Payslip'}
          </button>
        </form>
      </div>
    </div>
  );
}
