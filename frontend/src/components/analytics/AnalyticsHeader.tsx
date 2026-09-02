import React from 'react';
import { BarChart3, Building2, Download } from 'lucide-react';

export type AnalyticsRange = '7d' | '30d' | '90d' | 'all';

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

// Previously every metric on this dashboard was a fixed all-time total
// with no way to narrow the window, and there was no indication when a
// Manager was looking at company-wide numbers rather than their own
// team's — this adds both: a range picker (wired to ?range= on
// GET /analytics) and a badge reflecting what the backend actually scoped
// the response to (see analytics.controller.ts's `meta` field), rather
// than assuming based on the viewer's role alone — a Manager with no
// department assigned still correctly shows the company-wide badge.
export function AnalyticsHeader({
  range,
  onRangeChange,
  scopedToDepartment,
  onExportCsv,
}: {
  range: AnalyticsRange;
  onRangeChange: (range: AnalyticsRange) => void;
  scopedToDepartment?: boolean;
  onExportCsv?: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Workspace Analytics
        </h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
          Real-time telemetry, productivity scorecard, and system resource metrics.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {scopedToDepartment && (
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl px-3 py-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Your Department Only</span>
          </div>
        )}
        <div className="flex items-center gap-0.5 bg-card dark:bg-card border border-border dark:border-border rounded-xl p-1 shadow-sm">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onRangeChange(opt.value)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
                range === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted dark:hover:bg-card'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-card dark:bg-card border border-border dark:border-border rounded-xl px-3.5 py-1.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Telemetry Hooked</span>
        </div>
        {onExportCsv && (
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 bg-card dark:bg-card border border-border dark:border-border rounded-xl px-3.5 py-1.5 shadow-sm hover:bg-muted dark:hover:bg-card transition-all"
            title="Export current metrics as CSV"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Export CSV</span>
          </button>
        )}
      </div>
    </div>
  );
}
