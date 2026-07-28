import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { WidgetHeader, WidgetEmptyState } from '../WidgetHeader';

export function MeetingsWidget({ tasks }: { tasks: any[] | undefined }) {
  const today = new Date().toDateString();
  const todayTasks =
    tasks?.filter((t: any) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate).toDateString() === today;
    }) || [];

  return (
    <div className="flex-1 flex flex-col">
      <WidgetHeader icon={<Calendar />} title="Today's Agenda" />
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[220px]">
        {todayTasks.length === 0 ? (
          <WidgetEmptyState label="No events/tasks scheduled for today." />
        ) : (
          todayTasks.map((task: any) => (
            <div
              key={task.id}
              className="p-3 border-l-4 border-l-primary bg-muted/40 rounded-r-xl space-y-1"
            >
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>All Day Event</span>
                </span>
                <span>{task.priority}</span>
              </div>
              <h4 className="font-semibold text-[13px] truncate leading-snug">{task.title}</h4>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
