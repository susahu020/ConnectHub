import React from 'react';
import { Activity } from 'lucide-react';
import { WidgetHeader, WidgetEmptyState } from '../WidgetHeader';

export function ActivityFeedWidget({ activity }: { activity: any[] | undefined }) {
  return (
    <div className="flex-1 flex flex-col">
      <WidgetHeader icon={<Activity />} iconClassName="text-indigo-500" title="Recent Activity Feed" />
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[220px]">
        {!activity || activity.length === 0 ? (
          <WidgetEmptyState label="No recent activity logs." />
        ) : (
          activity.map((log: any) => (
            <div key={log.id} className="flex items-start gap-3 text-xs">
              <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div className="space-y-0.5 flex-1 min-w-0">
                <p className="font-semibold text-foreground leading-normal capitalize">
                  {log.action.replace(/_/g, ' ')}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{log.details}</p>
                <span className="text-[10px] text-muted-foreground/70 font-medium">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
