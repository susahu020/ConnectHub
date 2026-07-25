import React from 'react';
import { X } from 'lucide-react';

export function AddSkillModal({
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
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs font-semibold">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Add Professional Skill</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-slate-400 uppercase text-[10px]">Skill Name</label>
            <input
              type="text"
              required
              placeholder="e.g. React, PostgreSQL, Docker"
              value={form.skillName}
              onChange={(e) => onFormChange({ ...form, skillName: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-400 uppercase text-[10px]">Expertise Level</label>
              <select
                value={form.level}
                onChange={(e) => onFormChange({ ...form, level: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-400 uppercase text-[10px]">Years Experience</label>
              <input
                type="number"
                min={0}
                value={form.yearsOfExp}
                onChange={(e) => onFormChange({ ...form, yearsOfExp: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 uppercase text-[10px]">Skill Category</label>
            <input
              type="text"
              placeholder="e.g. Frontend, Backend, UI/UX"
              value={form.category}
              onChange={(e) => onFormChange({ ...form, category: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl">
              Add Skill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
