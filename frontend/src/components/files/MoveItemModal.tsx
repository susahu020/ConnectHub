import React from 'react';
import { X } from 'lucide-react';

export function MoveItemModal({
  item,
  targetFolderId,
  onTargetFolderIdChange,
  moveOptions,
  onClose,
  onSubmit,
}: {
  item: { id: string; name: string; type: 'FILE' | 'FOLDER' };
  targetFolderId: string;
  onTargetFolderIdChange: (v: string) => void;
  moveOptions: any[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative animate-in fade-in duration-200">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground hover:bg-muted p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-base">Move {item.type === 'FOLDER' ? 'Folder' : 'File'}</h3>
          <p className="text-xs text-muted-foreground">Select a target folder in the drive to relocate &quot;{item.name}&quot;.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold">
          <div className="space-y-2">
            <label className="text-muted-foreground uppercase text-[10px]">Select Target Directory</label>
            <select
              value={targetFolderId}
              onChange={(e) => onTargetFolderIdChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
            >
              <option value="">Root Directory</option>
              {moveOptions.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md">
            Relocate Item
          </button>
        </form>
      </div>
    </div>
  );
}
