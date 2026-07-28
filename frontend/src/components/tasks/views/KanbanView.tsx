import React from 'react';
import { AlertTriangle, Calendar, CheckSquare, Clock } from 'lucide-react';
import { getPriorityBadge, isBlocked, KANBAN_COLUMNS } from '../taskHelpers';

export function KanbanView({
  loadingTasks,
  filteredTasks,
  onOpenTaskDetail,
  onDragStart,
  onDrop,
  onStatusChange,
}: {
  loadingTasks: boolean;
  filteredTasks: any[];
  onOpenTaskDetail: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  if (loadingTasks) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-14rem)] overflow-y-auto pb-6">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.status} className={`flex flex-col rounded-2xl border border-t-4 p-4 shadow-sm space-y-4 animate-pulse-slow ${col.color}`}>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-xs uppercase tracking-wider">{col.title}</span>
              <span className="h-5 w-5 bg-slate-200/50 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-extrabold text-slate-400">0</span>
            </div>
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-3 shadow-sm">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
                  <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-14rem)] overflow-y-auto pb-6">
      {KANBAN_COLUMNS.map((col) => {
        const colTasks = filteredTasks.filter((t: any) => t.status === col.status);
        return (
          <div
            key={col.status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.status)}
            className={`flex flex-col rounded-2xl border border-t-4 p-4 shadow-sm space-y-4 transition-colors duration-200 ${col.color} animate-fade-in`}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-xs uppercase tracking-wider">{col.title}</span>
              <span className="h-5 min-w-5 px-1 bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {colTasks.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[150px]">
              {colTasks.map((task: any) => {
                const blocked = isBlocked(task);
                const completedSubtasks = task.subtasks?.filter((s: any) => s.isCompleted).length || 0;
                const totalSubtasks = task.subtasks?.length || 0;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id)}
                    onClick={() => onOpenTaskDetail(task.id)}
                    className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-3 group relative"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        <div className="h-6 w-6 bg-slate-100 dark:bg-slate-850 rounded-full flex items-center justify-center font-bold text-[10px] uppercase text-slate-500 overflow-hidden border">
                          {task.assignee.firstName[0]}
                          {task.assignee.lastName[0]}
                        </div>
                      </div>

                      {blocked && (
                        <div className="flex items-center space-x-1 text-[10px] text-red-500 font-extrabold uppercase bg-red-50 dark:bg-red-950/20 border border-red-200 px-1.5 py-0.5 rounded w-max">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>Blocked</span>
                        </div>
                      )}

                      {task.status !== 'COMPLETED' && task.dueDate && new Date(task.dueDate) < new Date() && (
                        <div className="flex items-center space-x-1 text-[10px] text-red-500 font-extrabold uppercase bg-red-50 dark:bg-red-950/20 border border-red-200 px-1.5 py-0.5 rounded w-max">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>Overdue</span>
                        </div>
                      )}

                      <h4 className="font-bold text-xs leading-snug group-hover:text-primary transition-all line-clamp-2">
                        {task.title}
                      </h4>
                    </div>

                    {totalSubtasks > 0 && (
                      <p className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
                        <CheckSquare className="h-3 w-3 text-emerald-500" />
                        <span>
                          {completedSubtasks} / {totalSubtasks} Checklist Items
                        </span>
                      </p>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-450">
                        <span>Milestone Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${task.progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Limit'}</span>
                      </span>
                      <select
                        onClick={(e) => e.stopPropagation()}
                        value={task.status}
                        onChange={(e) => onStatusChange(task.id, e.target.value)}
                        className="bg-transparent border-none text-slate-400 font-bold focus:outline-none hover:text-primary"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">Progress</option>
                        <option value="REVIEW">Review</option>
                        <option value="COMPLETED">Done</option>
                      </select>
                    </div>
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <div className="text-center py-6 text-[10px] text-slate-400 border border-dashed rounded-xl">
                  Drag tasks here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
