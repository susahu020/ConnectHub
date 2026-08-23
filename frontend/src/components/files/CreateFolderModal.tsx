import React from 'react';
import { X } from 'lucide-react';

export function CreateFolderModal({
  open,
  onClose,
  folderName,
  onFolderNameChange,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  folderName: string;
  onFolderNameChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative animate-in fade-in duration-200">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground hover:bg-muted p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-base">Create Folder Directory</h3>
          <p className="text-xs text-muted-foreground">Enter a descriptive folder name to structure files.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold">
          <div className="space-y-2">
            <label className="text-muted-foreground uppercase text-[10px]">Folder Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Design Assets"
              value={folderName}
              onChange={(e) => onFolderNameChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md">
            Create Directory
          </button>
        </form>
      </div>
    </div>
  );
}
