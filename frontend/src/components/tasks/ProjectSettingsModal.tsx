import React from 'react';
import { X } from 'lucide-react';

export function ProjectSettingsModal({
  open,
  onClose,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  status,
  onStatusChange,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200 text-left">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-slate-850 dark:text-slate-200">Project Workspace Settings</h3>
          <p className="text-xs text-slate-400">Modify metadata or remove this workspace pipeline.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold">
          <div className="space-y-2">
            <label className="text-slate-400 uppercase text-[10px]">Project Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 uppercase text-[10px]">Description</label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 uppercase text-[10px]">Project Status</label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-2">
            <button type="submit" className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
              Save Changes
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-550 dark:bg-red-950/20 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/30 font-bold rounded-xl transition-all"
            >
              Delete Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
