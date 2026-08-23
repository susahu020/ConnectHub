import React from 'react';
import { History, ArrowLeft } from 'lucide-react';

export function VersionHistoryDrawer({
  versions,
  onClose,
  onPreviewVersion,
  onRollback,
}: {
  versions: any[] | undefined;
  onClose: () => void;
  onPreviewVersion: (id: string) => void;
  onRollback: (version: any) => void;
}) {
  return (
    <div className="w-72 border-l dark:border-border bg-muted/50 dark:bg-card/50 flex flex-col shrink-0 animate-slide-right min-h-0 z-10">
      <div className="p-4 border-b dark:border-border flex items-center justify-between shrink-0">
        <h3 className="font-extrabold text-xs text-foreground dark:text-foreground flex items-center space-x-1.5">
          <History className="h-4 w-4 text-primary" />
          <span>Version History</span>
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-secondary dark:hover:bg-card rounded-lg text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto p-3.5 space-y-3">
        {versions?.map((ver: any, index: number) => (
          <div key={ver.id} className="bg-card dark:bg-card p-3.5 rounded-2xl border dark:border-border shadow-sm space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-muted dark:bg-card text-muted-foreground dark:text-foreground px-2 py-0.5 rounded font-black uppercase">
                v{ver.version}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">{new Date(ver.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              Changed by:{' '}
              <span className="font-bold text-foreground dark:text-foreground">
                {ver.changedBy?.firstName} {ver.changedBy?.lastName}
              </span>
            </div>

            <div className="flex space-x-1.5 pt-1">
              <button
                onClick={() => onPreviewVersion(ver.id)}
                className="flex-1 py-1 text-[10px] font-bold text-center border border-border dark:border-border text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-card rounded-lg transition-all"
              >
                Preview
              </button>
              {index > 0 && (
                <button
                  onClick={() => onRollback(ver)}
                  className="flex-1 py-1 text-[10px] font-bold text-center border border-dashed border-primary/45 text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all"
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
