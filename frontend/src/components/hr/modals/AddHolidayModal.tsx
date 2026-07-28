import React from 'react';
import { X } from 'lucide-react';

export function AddHolidayModal({ open, onClose, isPending, onSubmit }: { open: boolean; onClose: () => void; isPending: boolean; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Add New Company Holiday</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Holiday Name</label>
            <input type="text" name="holidayName" required placeholder="e.g. Independence Day" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Holiday Date</label>
            <input type="date" name="date" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isMandatory" name="isMandatory" defaultChecked className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded" />
            <label htmlFor="isMandatory" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Mandatory (Office Closed)
            </label>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
            <textarea name="description" rows={2} placeholder="Optional holiday details..." className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
          </div>
          <button type="submit" disabled={isPending} className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all">
            {isPending ? 'Creating...' : 'Create Holiday'}
          </button>
        </form>
      </div>
    </div>
  );
}
