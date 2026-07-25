import React from 'react';
import { resolveFileUrl } from '../../../lib/utils';

export function VersionCompareTab({
  versions,
  compareVersion1,
  compareVersion2,
  onSelectVersion1,
  onSelectVersion2,
}: {
  versions: any[] | undefined;
  compareVersion1: any;
  compareVersion2: any;
  onSelectVersion1: (v: any) => void;
  onSelectVersion2: (v: any) => void;
}) {
  return (
    <div className="w-full text-left space-y-4">
      <div className="p-4 bg-white dark:bg-slate-900 border rounded-2xl space-y-4 shadow-sm">
        <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-100">Select File Versions to Compare</h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Version A (Older)</label>
            <select
              onChange={(e) => onSelectVersion1(versions?.find((v: any) => v.id === e.target.value))}
              className="w-full p-2 border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs font-bold"
            >
              <option value="">Select Version</option>
              {versions?.map((v: any) => (
                <option key={v.id} value={v.id}>
                  Version v{v.version} ({new Date(v.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Version B (Newer)</label>
            <select
              onChange={(e) => onSelectVersion2(versions?.find((v: any) => v.id === e.target.value))}
              className="w-full p-2 border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs font-bold"
            >
              <option value="">Select Version</option>
              {versions?.map((v: any) => (
                <option key={v.id} value={v.id}>
                  Version v{v.version} ({new Date(v.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {compareVersion1 && compareVersion2 ? (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-3">
          <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Comparison Report</h5>

          <div className="grid grid-cols-3 gap-2 border-b pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div>Attribute</div>
            <div>Version v{compareVersion1.version}</div>
            <div>Version v{compareVersion2.version}</div>
          </div>

          <div className="space-y-2 text-xs font-semibold">
            <div className="grid grid-cols-3 gap-2 py-1 border-b">
              <span className="text-slate-450">Created Date</span>
              <span>{new Date(compareVersion1.createdAt).toLocaleString()}</span>
              <span>{new Date(compareVersion2.createdAt).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1 border-b">
              <span className="text-slate-450">File Link</span>
              <a href={resolveFileUrl(compareVersion1.url)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                v{compareVersion1.version} Source
              </a>
              <a href={resolveFileUrl(compareVersion2.url)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                v{compareVersion2.version} Source
              </a>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1">
              <span className="text-slate-450">Status</span>
              <span className="text-slate-400">Archived</span>
              <span className="text-emerald-500 font-bold">Active</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-xs text-slate-400 italic">Please select two version logs to initialize comparison report.</div>
      )}
    </div>
  );
}
