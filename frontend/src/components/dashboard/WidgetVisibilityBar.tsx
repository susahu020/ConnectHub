import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function WidgetVisibilityBar({
  layouts,
  onToggleWidget,
}: {
  layouts: any[];
  onToggleWidget: (key: string) => void;
}) {
  return (
    <div className="p-4 border bg-primary/5 border-primary/20 rounded-2xl space-y-3">
      <p className="text-xs font-bold uppercase text-primary tracking-wider">Configure Dashboard Widgets</p>
      <div className="flex flex-wrap gap-2.5">
        {layouts.map((w) => (
          <button
            key={w.widgetKey}
            onClick={() => onToggleWidget(w.widgetKey)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors shadow-sm ${
              w.visible
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white dark:bg-slate-900 text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {w.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span className="capitalize">{w.widgetKey.replace('_', ' ')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
