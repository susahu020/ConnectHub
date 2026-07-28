import React from 'react';
import { BarChart3 } from 'lucide-react';

export function AnalyticsHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Workspace Analytics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Real-time telemetry, productivity scorecard, and system resource metrics.
        </p>
      </div>
      <div className="mt-4 md:mt-0 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-1.5 shadow-sm">
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Telemetry Hooked</span>
      </div>
    </div>
  );
}
