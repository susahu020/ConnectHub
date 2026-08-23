import React from 'react';
import { XCircle, History } from 'lucide-react';
import { parseMarkdown } from './markdownParser';

export function VersionPreviewModal({ versionObj, onClose, onRollback }: { versionObj: any; onClose: () => void; onRollback: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card dark:bg-card border dark:border-border rounded-3xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up text-left">
        <div className="p-5 border-b dark:border-border flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-foreground dark:text-foreground">Version {versionObj.version} Preview</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Saved on {new Date(versionObj.createdAt).toLocaleString()} by {versionObj.changedBy?.firstName} {versionObj.changedBy?.lastName}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted dark:hover:bg-card rounded-lg text-muted-foreground hover:text-muted-foreground">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="border-b dark:border-border pb-3">
            <h1 className="text-xl font-black text-foreground leading-tight">{versionObj.title}</h1>
          </div>
          <div
            className="prose dark:prose-invert max-w-none text-foreground dark:text-foreground text-xs leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(versionObj.content) }}
          />
        </div>

        <div className="p-4 bg-muted dark:bg-card/50 border-t dark:border-border flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 border text-xs font-bold rounded-xl hover:bg-muted dark:hover:bg-card text-foreground dark:text-foreground">
            Close Preview
          </button>
          <button
            onClick={onRollback}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-md hover:bg-primary/95 flex items-center space-x-1.5"
          >
            <History className="h-3.5 w-3.5" />
            <span>Restore Version {versionObj.version}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
