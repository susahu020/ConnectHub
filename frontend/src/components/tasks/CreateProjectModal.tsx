import React from 'react';
import { X } from 'lucide-react';

export function CreateProjectModal({
  open,
  onClose,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1.5 rounded-lg"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-lg">Create Project Workspace</h3>
          <p className="text-xs text-muted-foreground">Initialize a new project pipeline board.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold text-left">
          <div className="space-y-2">
            <label className="text-muted-foreground uppercase text-[10px]">Project Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Mobile Application"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-muted-foreground uppercase text-[10px]">Description</label>
            <textarea
              placeholder="Brief scope summary..."
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none h-20 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md disabled:opacity-60"
          >
            {isPending ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
