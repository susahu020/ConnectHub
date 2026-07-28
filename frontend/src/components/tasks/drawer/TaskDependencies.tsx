import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function TaskDependencies({
  dependencies,
  otherTasks,
  currentTaskId,
  blockerTaskId,
  onBlockerTaskIdChange,
  onAddDependency,
  onRemoveDependency,
}: {
  dependencies: any[] | undefined;
  otherTasks: any[] | undefined;
  currentTaskId: string;
  blockerTaskId: string;
  onBlockerTaskIdChange: (v: string) => void;
  onAddDependency: (e: React.FormEvent) => void;
  onRemoveDependency: (id: string) => void;
}) {
  return (
    <div className="space-y-3 pt-3 border-t">
      <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center space-x-1.5">
        <AlertTriangle className="h-4 w-4 text-orange-400" />
        <span>Dependencies Blockers</span>
      </h4>

      <form onSubmit={onAddDependency} className="space-y-2">
        <select
          required
          value={blockerTaskId}
          onChange={(e) => onBlockerTaskIdChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
        >
          <option value="">-- Select Blocker Task --</option>
          {otherTasks
            ?.filter((t: any) => t.id !== currentTaskId)
            ?.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
        </select>
        <button type="submit" className="w-full py-1.5 bg-primary text-white rounded-xl text-xs font-bold shadow">
          Link Blocker Task
        </button>
      </form>

      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
        {!dependencies || dependencies.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic">Clear. No dependencies.</p>
        ) : (
          dependencies.map((dep: any) => (
            <div key={dep.dependsOnTaskId} className="p-2 border border-orange-200 bg-orange-50/10 rounded-xl flex items-center justify-between text-[10px]">
              <span className="font-bold text-orange-600 truncate max-w-[140px]">{dep.dependsOnTask?.title}</span>
              <button type="button" onClick={() => onRemoveDependency(dep.dependsOnTaskId)} className="p-1 hover:bg-slate-100 rounded text-red-500 font-bold">
                Unlink
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
