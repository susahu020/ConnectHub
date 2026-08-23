import React from 'react';
import { Trash2, Folder, RefreshCw, Trash, Eraser } from 'lucide-react';

function daysAgoLabel(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function purgeDateLabel(deletedAt: string, retentionDays: number): string {
  const purgeDate = new Date(new Date(deletedAt).getTime() + retentionDays * 24 * 60 * 60 * 1000);
  return purgeDate.toLocaleDateString();
}

export function RecycleBinView({
  loading,
  recycleBin,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}: {
  loading: boolean;
  recycleBin: any;
  onRestore: (id: string, type: 'FILE' | 'FOLDER') => void;
  onPermanentDelete: (id: string, type: 'FILE' | 'FOLDER') => void;
  onEmptyTrash: () => void;
}) {
  const isEmpty = recycleBin?.folders?.length === 0 && recycleBin?.files?.length === 0;
  const retentionDays: number | null = recycleBin?.retentionDays || null;

  return (
    <div className="space-y-6">
      <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center space-x-2">
          <Trash2 className="h-5 w-5 text-red-500" />
          <div>
            <span className="text-xs text-red-500 font-bold uppercase tracking-wider block">Recycle Bin Directory</span>
            {retentionDays && (
              <span className="text-[10px] text-red-400">
                Items are permanently deleted {retentionDays} day{retentionDays === 1 ? '' : 's'} after being moved here.
              </span>
            )}
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={onEmptyTrash}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 bg-red-500 text-primary-foreground rounded-lg hover:bg-red-600"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-xs text-muted-foreground py-20">Loading recycle items...</div>
      ) : isEmpty ? (
        <div className="text-center text-xs text-muted-foreground py-20 border rounded-2xl bg-card dark:bg-card">The Recycle Bin is empty.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {recycleBin?.folders?.map((fold: any) => (
            <div key={fold.id} className="bg-card dark:bg-card border border-red-100 dark:border-red-950/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center space-x-3 min-w-0">
                <Folder className="h-10 w-10 text-red-400 shrink-0 fill-red-50" />
                <div className="min-w-0">
                  <h4 className="font-bold text-xs truncate text-foreground leading-snug">{fold.name}</h4>
                  <p className="text-[10px] text-muted-foreground">
                    {fold.deletedAt ? `Deleted ${daysAgoLabel(fold.deletedAt)}` : 'Soft-deleted folder'}
                    {retentionDays && fold.deletedAt && ` · purges ${purgeDateLabel(fold.deletedAt, retentionDays)}`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[10px] font-bold">
                <button
                  onClick={() => onRestore(fold.id, 'FOLDER')}
                  className="flex items-center justify-center space-x-1 py-1.5 border rounded-lg hover:bg-muted dark:hover:bg-card text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  onClick={() => onPermanentDelete(fold.id, 'FOLDER')}
                  className="flex items-center justify-center space-x-1 py-1.5 bg-red-500 text-primary-foreground rounded-lg hover:bg-red-600"
                >
                  <Trash className="h-3.5 w-3.5" />
                  <span>Purge</span>
                </button>
              </div>
            </div>
          ))}

          {recycleBin?.files?.map((file: any) => (
            <div key={file.id} className="bg-card dark:bg-card border border-red-100 dark:border-red-950/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="h-9 w-9 bg-red-50 border rounded-lg flex items-center justify-center text-[10px] font-extrabold text-red-500 uppercase shrink-0">
                  {file.fileType.substring(0, 4)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs truncate text-foreground leading-snug">{file.name}</h4>
                  <p className="text-[10px] text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                    {file.deletedAt && ` · Deleted ${daysAgoLabel(file.deletedAt)}`}
                    {retentionDays && file.deletedAt && ` · purges ${purgeDateLabel(file.deletedAt, retentionDays)}`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[10px] font-bold">
                <button
                  onClick={() => onRestore(file.id, 'FILE')}
                  className="flex items-center justify-center space-x-1 py-1.5 border rounded-lg hover:bg-muted dark:hover:bg-card text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  onClick={() => onPermanentDelete(file.id, 'FILE')}
                  className="flex items-center justify-center space-x-1 py-1.5 bg-red-500 text-primary-foreground rounded-lg hover:bg-red-600"
                >
                  <Trash className="h-3.5 w-3.5" />
                  <span>Purge</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
