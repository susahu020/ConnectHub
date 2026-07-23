import React from 'react';
import { Layers } from 'lucide-react';

export function TaskMetadataPanel({
  task,
  colleagues,
  onInlineUpdate,
}: {
  task: any;
  colleagues: any;
  onInlineUpdate: (body: any) => void;
}) {
  return (
    <div className="space-y-4 pt-3 border-t">
      <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center space-x-1.5">
        <Layers className="h-4 w-4 text-primary" />
        <span>Agile & Schedule Metadata</span>
      </h4>

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <span className="text-slate-400 font-bold block uppercase text-[10px] mb-1">Sprint</span>
          <input
            type="text"
            value={task.sprintName || ''}
            placeholder="No Sprint..."
            onChange={(e) => onInlineUpdate({ sprintName: e.target.value || null })}
            className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px]"
          />
        </div>
        <div>
          <span className="text-slate-400 font-bold block uppercase text-[10px] mb-1">Milestone</span>
          <input
            type="text"
            value={task.milestoneName || ''}
            placeholder="No Milestone..."
            onChange={(e) => onInlineUpdate({ milestoneName: e.target.value || null })}
            className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <span className="text-slate-400 font-bold block uppercase text-[10px] mb-1">Estimate (Hours)</span>
          <input
            type="number"
            step="0.5"
            min="0"
            value={task.estimatedHours || ''}
            placeholder="Unestimated"
            onChange={(e) => onInlineUpdate({ estimatedHours: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px]"
          />
        </div>
        <div>
          <span className="text-slate-400 font-bold block uppercase text-[10px] mb-1">Progress (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={task.progress ?? 0}
            onChange={(e) => onInlineUpdate({ progress: parseInt(e.target.value) || 0 })}
            className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px]"
          />
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-slate-400 font-bold block uppercase text-[10px]">Labels (Comma separated)</span>
        <input
          type="text"
          value={task.labels?.join(', ') || ''}
          placeholder="e.g. Frontend, Bug, V1"
          onChange={(e) =>
            onInlineUpdate({ labels: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })
          }
          className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px]"
        />
      </div>

      <div className="space-y-1">
        <span className="text-slate-400 font-bold block uppercase text-[10px]">Watchers</span>
        <div className="max-h-20 overflow-y-auto border rounded-lg p-2 bg-slate-50 dark:bg-slate-800 space-y-1.5">
          {colleagues?.users?.map((u: any) => {
            const isWatching = task.watcherIds?.includes(u.id) || false;
            return (
              <label key={u.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-0.5 rounded transition-all text-[10px]">
                <input
                  type="checkbox"
                  checked={isWatching}
                  onChange={(e) => {
                    const currentWatchers = task.watcherIds || [];
                    const newWatchers = e.target.checked
                      ? [...currentWatchers, u.id]
                      : currentWatchers.filter((id: string) => id !== u.id);
                    onInlineUpdate({ watcherIds: newWatchers });
                  }}
                  className="rounded border-slate-350 text-primary h-3 w-3"
                />
                <span className="text-slate-650 dark:text-slate-300 font-semibold">
                  {u.firstName} {u.lastName}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px] items-center">
        <label className="flex items-center space-x-1.5 cursor-pointer mt-3">
          <input
            type="checkbox"
            checked={task.isRecurring || false}
            onChange={(e) => onInlineUpdate({ isRecurring: e.target.checked })}
            className="rounded border-slate-350 text-primary h-3.5 w-3.5"
          />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Recurring</span>
        </label>
        {task.isRecurring && (
          <div>
            <span className="text-slate-400 font-bold block uppercase text-[10px] mb-1">Interval</span>
            <select
              value={task.recurrenceInterval || 'daily'}
              onChange={(e) => onInlineUpdate({ recurrenceInterval: e.target.value })}
              className="w-full px-2 py-1 border rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px]"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
