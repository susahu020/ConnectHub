import React from 'react';
import { Download } from 'lucide-react';

export function BulkActionBar({ count, onDownload, onDeselectAll }: { count: number; onDownload: () => void; onDeselectAll: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-slate-800 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center space-x-6 border border-slate-700/60 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex flex-col">
        <span className="text-xs font-black">{count} files selected</span>
        <span className="text-[10px] text-slate-400 font-semibold">Bulk operations</span>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onDownload}
          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary/90 flex items-center space-x-1.5 transition-all"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Bulk Download</span>
        </button>
        <button onClick={onDeselectAll} className="px-3 py-2 bg-slate-800 dark:bg-slate-700 text-slate-350 hover:text-white text-xs font-bold rounded-xl hover:bg-slate-750 transition-all">
          Deselect All
        </button>
      </div>
    </div>
  );
}
