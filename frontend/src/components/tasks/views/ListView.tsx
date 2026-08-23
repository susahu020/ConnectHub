import React from 'react';
import { AlertTriangle, CheckSquare } from 'lucide-react';
import { getPriorityBadge, isBlocked } from '../taskHelpers';

export function ListView({
  loadingTasks,
  filteredTasks,
  onOpenTaskDetail,
}: {
  loadingTasks: boolean;
  filteredTasks: any[];
  onOpenTaskDetail: (id: string) => void;
}) {
  return (
    <div className="bg-card dark:bg-card border rounded-2xl overflow-x-auto shadow-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b bg-muted/50 dark:bg-card/40 text-muted-foreground uppercase font-extrabold text-[10px] tracking-wider">
            <th className="p-4">Task Name</th>
            <th className="p-4">Assignee</th>
            <th className="p-4">Priority</th>
            <th className="p-4">Due Date</th>
            <th className="p-4">Blockers</th>
            <th className="p-4">Checklist</th>
            <th className="p-4">Logged Work</th>
            <th className="p-4">Milestone</th>
          </tr>
        </thead>
        <tbody>
          {loadingTasks ? (
            Array.from({ length: 3 }).map((_, index) => (
              <tr key={index} className="animate-pulse-slow border-b">
                <td className="p-4"><div className="h-3.5 bg-secondary dark:bg-card rounded w-2/3" /></td>
                <td className="p-4"><div className="h-6 w-6 bg-secondary dark:bg-card rounded-full" /></td>
                <td className="p-4"><div className="h-4 bg-secondary dark:bg-card rounded w-12" /></td>
                <td className="p-4"><div className="h-3.5 bg-secondary dark:bg-card rounded w-20" /></td>
                <td className="p-4"><div className="h-3.5 bg-secondary dark:bg-card rounded w-10" /></td>
                <td className="p-4"><div className="h-3.5 bg-secondary dark:bg-card rounded w-24" /></td>
                <td className="p-4"><div className="h-3.5 bg-secondary dark:bg-card rounded w-16" /></td>
                <td className="p-4"><div className="h-3 bg-secondary dark:bg-card rounded w-16" /></td>
              </tr>
            ))
          ) : filteredTasks.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-16 text-center">
                <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                  <CheckSquare className="h-10 w-10 text-foreground dark:text-foreground stroke-1" />
                  <p className="text-xs font-bold text-foreground dark:text-foreground">No matching tasks found</p>
                  <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-normal">
                    Adjust search queries or filters to explore alternative tasks.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            filteredTasks.map((task: any) => {
              const blocked = isBlocked(task);
              const totalLogged = task.timeLogs?.reduce((sum: number, l: any) => sum + l.minutes, 0) || 0;
              const loggedHours = (totalLogged / 60).toFixed(1);

              return (
                <tr
                  key={task.id}
                  onClick={() => onOpenTaskDetail(task.id)}
                  className="border-b hover:bg-muted dark:hover:bg-card/20 cursor-pointer transition-colors"
                >
                  <td className="p-4 font-bold max-w-[200px] truncate">{task.title}</td>
                  <td className="p-4 font-medium">
                    {task.assignee.firstName} {task.assignee.lastName}
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {task.dueDate ? (
                      <span className={task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date() ? 'text-red-500 font-bold flex items-center space-x-1' : ''}>
                        {task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date() && <AlertTriangle className="h-3 w-3 shrink-0" />}
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-4">
                    {blocked ? (
                      <span className="text-[10px] font-extrabold text-red-500 uppercase bg-red-50 px-2 py-0.5 border border-red-200 rounded">Blocked</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Clear</span>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground font-bold">
                    {task.subtasks?.filter((s: any) => s.isCompleted).length || 0} / {task.subtasks?.length || 0}
                  </td>
                  <td className="p-4 font-semibold text-muted-foreground">{loggedHours} hr(s)</td>
                  <td className="p-4 w-[160px]">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-muted dark:bg-card h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${task.progress}%` }} />
                      </div>
                      <span className="font-bold text-[10px] text-muted-foreground">{task.progress}%</span>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
