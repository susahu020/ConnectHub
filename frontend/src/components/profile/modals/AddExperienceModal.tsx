import React from 'react';
import { X } from 'lucide-react';

export function AddExperienceModal({
  open,
  onClose,
  form,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  form: any;
  onFormChange: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card dark:bg-card border dark:border-border rounded-3xl w-full max-w-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 text-xs font-semibold">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-black text-foreground">Add Work Experience</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground uppercase text-[10px]">Company Name</label>
              <input
                type="text"
                required
                value={form.company}
                onChange={(e) => onFormChange({ ...form, company: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground uppercase text-[10px]">Role / Designation</label>
              <input
                type="text"
                required
                value={form.designation}
                onChange={(e) => onFormChange({ ...form, designation: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground uppercase text-[10px]">Department (Optional)</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => onFormChange({ ...form, department: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground uppercase text-[10px]">Start Date</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => onFormChange({ ...form, startDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground uppercase text-[10px]">End Date</label>
              <input
                type="date"
                disabled={form.isCurrent}
                value={form.endDate}
                onChange={(e) => onFormChange({ ...form, endDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isCurrent"
              checked={form.isCurrent}
              onChange={(e) => onFormChange({ ...form, isCurrent: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="isCurrent" className="text-xs text-foreground dark:text-foreground">
              I am currently working in this role
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground uppercase text-[10px]">Technologies (Comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. React, Node.js, TypeScript"
              value={form.technologies}
              onChange={(e) => onFormChange({ ...form, technologies: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground uppercase text-[10px]">Role Description</label>
            <textarea
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground uppercase text-[10px]">Key Achievements</label>
            <input
              type="text"
              placeholder="e.g. Delivered 40% performance enhancement on backend REST gateways"
              value={form.achievements}
              onChange={(e) => onFormChange({ ...form, achievements: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl">
              Save Experience
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
