import React from 'react';
import { X } from 'lucide-react';

export function RequestSwapModal({
  open,
  onClose,
  employees,
  currentUserId,
  shiftAssignments,
  swapCoworkerId,
  onSwapCoworkerIdChange,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  employees: any[];
  currentUserId?: string;
  shiftAssignments: any[];
  swapCoworkerId: string;
  onSwapCoworkerIdChange: (v: string) => void;
  isPending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Request Shift Swap</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">My Shift Assignment to Swap</label>
            <select name="requesterAssignmentId" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
              <option value="">— Select My Shift —</option>
              {shiftAssignments
                .filter((a: any) => a.userId === currentUserId)
                .map((assign: any) => (
                  <option key={assign.id} value={assign.id}>
                    {assign.shift?.name} ({new Date(assign.startDate).toLocaleDateString()} - {assign.shift?.startTime})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Teammate to Swap With</label>
            <select
              name="assigneeId"
              value={swapCoworkerId}
              onChange={(e) => onSwapCoworkerIdChange(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
            >
              <option value="">— Select Coworker —</option>
              {employees
                .filter((emp: any) => emp.id !== currentUserId)
                .map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Teammate&apos;s Shift Assignment</label>
            <select name="assigneeAssignmentId" required className="w-full bg-slate-50 dark:bg-slate-855 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
              <option value="">— Select Teammate&apos;s Shift —</option>
              {shiftAssignments
                .filter((a: any) => a.userId === swapCoworkerId)
                .map((assign: any) => (
                  <option key={assign.id} value={assign.id}>
                    {assign.shift?.name} ({new Date(assign.startDate).toLocaleDateString()})
                  </option>
                ))}
            </select>
          </div>
          <button type="submit" disabled={isPending} className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all">
            {isPending ? 'Sending...' : 'Send Swap Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
