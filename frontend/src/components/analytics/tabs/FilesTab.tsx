import React from 'react';
import { formatBytes } from '../formatBytes';

export function FilesTab({ stats }: { stats: any }) {
  const { fileUsage } = stats;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">File Type Capacity Distribution</h4>

        <div className="space-y-4">
          {fileUsage.fileTypeDistribution.map((group: any) => {
            const countPct = fileUsage.totalFiles > 0 ? ((group.count / fileUsage.totalFiles) * 100).toFixed(0) : '0';
            return (
              <div key={group.category} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                  <span>
                    {group.category} ({group.count} files)
                  </span>
                  <span>
                    {formatBytes(group.totalSize)} ({countPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-850 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${countPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
