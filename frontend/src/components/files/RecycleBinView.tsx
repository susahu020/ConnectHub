import React from 'react';
import { Trash2, Folder, RefreshCw, Trash } from 'lucide-react';

export function RecycleBinView({
  loading,
  recycleBin,
  onRestore,
  onPermanentDelete,
}: {
  loading: boolean;
  recycleBin: any;
  onRestore: (id: string, type: 'FILE' | 'FOLDER') => void;
  onPermanentDelete: (id: string, type: 'FILE' | 'FOLDER') => void;
}) {
  const isEmpty = recycleBin?.folders?.length === 0 && recycleBin?.files?.length === 0;

  return (
    <div className="space-y-6">
      <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl flex items-center space-x-2">
        <Trash2 className="h-5 w-5 text-red-500" />
        <span className="text-xs text-red-500 font-bold uppercase tracking-wider">Recycle Bin Directory</span>
      </div>

      {loading ? (
        <div className="text-center text-xs text-slate-400 py-20">Loading recycle items...</div>
      ) : isEmpty ? (
        <div className="text-center text-xs text-slate-400 py-20 border rounded-2xl bg-white dark:bg-slate-900">The Recycle Bin is empty.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {recycleBin?.folders?.map((fold: any) => (
            <div key={fold.id} className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center space-x-3 min-w-0">
                <Folder className="h-10 w-10 text-red-400 shrink-0 fill-red-50" />
                <div className="min-w-0">
                  <h4 className="font-bold text-xs truncate text-foreground leading-snug">{fold.name}</h4>
                  <p className="text-[10px] text-slate-450">Soft-deleted folder</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[10px] font-bold">
                <button
                  onClick={() => onRestore(fold.id, 'FOLDER')}
                  className="flex items-center justify-center space-x-1 py-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  onClick={() => onPermanentDelete(fold.id, 'FOLDER')}
                  className="flex items-center justify-center space-x-1 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <Trash className="h-3.5 w-3.5" />
                  <span>Purge</span>
                </button>
              </div>
            </div>
          ))}

          {recycleBin?.files?.map((file: any) => (
            <div key={file.id} className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="h-9 w-9 bg-red-50 border rounded-lg flex items-center justify-center text-[10px] font-extrabold text-red-500 uppercase shrink-0">
                  {file.fileType.substring(0, 4)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs truncate text-foreground leading-snug">{file.name}</h4>
                  <p className="text-[10px] text-slate-450">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[10px] font-bold">
                <button
                  onClick={() => onRestore(file.id, 'FILE')}
                  className="flex items-center justify-center space-x-1 py-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  onClick={() => onPermanentDelete(file.id, 'FILE')}
                  className="flex items-center justify-center space-x-1 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
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
