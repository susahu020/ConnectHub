import React from 'react';
import { X } from 'lucide-react';

export function RequestLeaveModal({ open, onClose, isPending, onSubmit }: { open: boolean; onClose: () => void; isPending: boolean; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Apply for Leave</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Leave Type</label>
            <select name="leaveType" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
              <option value="ANNUAL">Annual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="UNPAID">Unpaid Leave</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
              <input type="date" name="startDate" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
              <input type="date" name="endDate" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reason for leave</label>
            <textarea name="reason" rows={3} required placeholder="Write a short explanation..." className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
          </div>
          <button type="submit" disabled={isPending} className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all">
            {isPending ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
