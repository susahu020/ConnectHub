import React from 'react';
import { XCircle, History } from 'lucide-react';
import { parseMarkdown } from './markdownParser';

export function VersionPreviewModal({ versionObj, onClose, onRollback }: { versionObj: any; onClose: () => void; onRollback: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up text-left">
        <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Version {versionObj.version} Preview</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Saved on {new Date(versionObj.createdAt).toLocaleString()} by {versionObj.changedBy?.firstName} {versionObj.changedBy?.lastName}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="border-b dark:border-slate-800 pb-3">
            <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{versionObj.title}</h1>
          </div>
          <div
            className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-xs leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(versionObj.content) }}
          />
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 border text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-300">
            Close Preview
          </button>
          <button
            onClick={onRollback}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary/95 flex items-center space-x-1.5"
          >
            <History className="h-3.5 w-3.5" />
            <span>Restore Version {versionObj.version}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
