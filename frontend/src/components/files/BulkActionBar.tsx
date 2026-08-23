import React from 'react';
import { Download } from 'lucide-react';

export function BulkActionBar({ count, onDownload, onDeselectAll }: { count: number; onDownload: () => void; onDeselectAll: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-6 py-4 rounded-3xl shadow-2xl flex items-center space-x-6 border border-background/15 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex flex-col">
        <span className="text-xs font-black">{count} files selected</span>
        <span className="text-[10px] text-background/60 font-semibold">Bulk operations</span>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onDownload}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-md hover:bg-primary/90 flex items-center space-x-1.5 transition-all"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Bulk Download</span>
        </button>
        <button onClick={onDeselectAll} className="px-3 py-2 bg-background/10 text-background/70 hover:text-background text-xs font-bold rounded-xl hover:bg-background/20 transition-all">
          Deselect All
        </button>
      </div>
    </div>
  );
}
