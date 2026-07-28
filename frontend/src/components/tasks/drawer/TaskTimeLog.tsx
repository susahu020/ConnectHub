import React from 'react';
import { Play } from 'lucide-react';

export function TaskTimeLog({
  timeLogs,
  logTimeMinutes,
  onLogTimeMinutesChange,
  onLogTime,
}: {
  timeLogs: any[] | undefined;
  logTimeMinutes: string;
  onLogTimeMinutesChange: (v: string) => void;
  onLogTime: (e: React.FormEvent) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center space-x-1.5">
        <Play className="h-4 w-4 text-emerald-500" />
        <span>Work Time Logs</span>
      </h4>

      <form onSubmit={onLogTime} className="flex space-x-2">
        <input
          type="number"
          required
          min="1"
          placeholder="Logged Minutes..."
          value={logTimeMinutes}
          onChange={(e) => onLogTimeMinutesChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
        />
        <button type="submit" className="px-3 bg-primary text-white rounded-xl text-xs font-bold shadow shrink-0">
          Log minutes
        </button>
      </form>

      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
        {!timeLogs || timeLogs.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic">No time logs logged.</p>
        ) : (
          timeLogs.map((log: any) => (
            <div key={log.id} className="p-2 border rounded-lg bg-slate-50/50 dark:bg-slate-800/10 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-slate-600 dark:text-slate-350">
                {log.user.firstName}: {log.minutes} min(s)
              </span>
              <span className="text-slate-400">{new Date(log.loggedAt).toLocaleDateString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
