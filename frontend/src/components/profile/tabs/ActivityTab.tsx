import React from 'react';
import { Compass, Loader2 } from 'lucide-react';

export function ActivityTab({
  activitySearch,
  onActivitySearchChange,
  activityLoading,
  activities,
}: {
  activitySearch: string;
  onActivitySearchChange: (v: string) => void;
  activityLoading: boolean;
  activities: any[];
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Workspace Activity</h3>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Logs of recent profile shifts, uploads, and edits.</p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search logs..."
            value={activitySearch}
            onChange={(e) => onActivitySearchChange(e.target.value)}
            className="pl-8 pr-4 py-2 border dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 focus:outline-none w-48 font-semibold"
          />
          <Compass className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {activityLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : activities.length > 0 ? (
        <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-6">
          {activities.map((act) => (
            <div key={act.id} className="relative group">
              <span className="absolute -left-[30px] top-1.5 h-4 w-4 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <div className="space-y-1 text-xs font-semibold">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">{act.action}</p>
                  <span className="text-[9px] text-slate-400">{new Date(act.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">{act.details}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-12 font-semibold">No recent activity logs matched this search.</p>
      )}
    </div>
  );
}
