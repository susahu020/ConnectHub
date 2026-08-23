import React from 'react';
import { X } from 'lucide-react';

export function CreateShiftModal({ open, onClose, isPending, onSubmit }: { open: boolean; onClose: () => void; isPending: boolean; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-black text-foreground">Define New Shift Type</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted dark:hover:bg-card rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Shift Name</label>
            <input type="text" name="shiftName" required placeholder="e.g. Morning Shift, Night Shift" className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Start Time</label>
              <input type="text" name="startTime" required placeholder="e.g. 09:00 AM" className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">End Time</label>
              <input type="text" name="endTime" required placeholder="e.g. 05:00 PM" className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Label Color (Hex / Name)</label>
            <input type="text" name="color" defaultValue="#3b82f6" placeholder="e.g. #10b981" className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
            <textarea name="description" rows={2} placeholder="Shift details..." className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
          </div>
          <button type="submit" disabled={isPending} className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:bg-primary-dark transition-all">
            {isPending ? 'Creating...' : 'Create Shift'}
          </button>
        </form>
      </div>
    </div>
  );
}
