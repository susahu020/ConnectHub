import React from 'react';
import { Trello } from 'lucide-react';
import { WidgetHeader, WidgetEmptyState } from '../WidgetHeader';
import { getPriorityColor, getStatusColor } from '../taskBadgeColors';

export function TasksWidget({ tasks }: { tasks: any[] | undefined }) {
  return (
    <div className="flex-1 flex flex-col">
      <WidgetHeader
        icon={<Trello />}
        iconClassName="text-emerald-500"
        title="My Active Tasks"
        action={{ label: 'Board', href: '/tasks' }}
      />
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[220px]">
        {!tasks || tasks.length === 0 ? (
          <WidgetEmptyState label="No pending tasks." />
        ) : (
          tasks.map((task: any) => (
            <div
              key={task.id}
              className="p-3.5 border border-border/70 rounded-xl hover:bg-muted/50 transition-colors flex items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="font-semibold text-[13px] truncate leading-snug">{task.title}</h4>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
