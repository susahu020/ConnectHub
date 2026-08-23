import React from 'react';
import { AlertTriangle, Calendar, CheckSquare, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  if (loadingTasks) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-14rem)] overflow-y-auto pb-6">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.status} className={`flex flex-col rounded-2xl border border-t-4 p-4 shadow-sm space-y-4 animate-pulse-slow ${col.color}`}>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-xs uppercase tracking-wider">{t(`kanban.columns.${col.status}`)}</span>
              <span className="h-5 w-5 bg-secondary/50 dark:bg-card rounded-full flex items-center justify-center text-[10px] font-extrabold text-muted-foreground">0</span>
            </div>
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="bg-card dark:bg-card border rounded-xl p-4 space-y-3 shadow-sm">
                  <div className="h-3.5 bg-secondary dark:bg-card rounded-md w-1/4" />
                  <div className="h-6 bg-secondary dark:bg-card rounded-md w-full" />
                  <div className="h-2 bg-secondary dark:bg-card rounded-md w-1/2" />
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
              <span className="font-bold text-xs uppercase tracking-wider">{t(`kanban.columns.${col.status}`)}</span>
              <span className="h-5 min-w-5 px-1 bg-secondary/50 dark:bg-card text-muted-foreground dark:text-foreground text-[10px] font-extrabold rounded-full flex items-center justify-center">
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
                    className="bg-card dark:bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-3 group relative"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        <div className="h-6 w-6 bg-muted dark:bg-card rounded-full flex items-center justify-center font-bold text-[10px] uppercase text-muted-foreground overflow-hidden border">
                          {task.assignee.firstName[0]}
                          {task.assignee.lastName[0]}
                        </div>
                      </div>

                      {blocked && (
                        <div className="flex items-center space-x-1 text-[10px] text-red-500 font-extrabold uppercase bg-red-50 dark:bg-red-950/20 border border-red-200 px-1.5 py-0.5 rounded w-max">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>{t('kanban.blocked')}</span>
                        </div>
                      )}

                      {task.status !== 'COMPLETED' && task.dueDate && new Date(task.dueDate) < new Date() && (
                        <div className="flex items-center space-x-1 text-[10px] text-red-500 font-extrabold uppercase bg-red-50 dark:bg-red-950/20 border border-red-200 px-1.5 py-0.5 rounded w-max">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{t('kanban.overdue')}</span>
                        </div>
                      )}

                      <h4 className="font-bold text-xs leading-snug group-hover:text-primary transition-all line-clamp-2">
                        {task.title}
                      </h4>
                    </div>

                    {totalSubtasks > 0 && (
                      <p className="text-[10px] text-muted-foreground font-bold flex items-center space-x-1">
                        <CheckSquare className="h-3 w-3 text-emerald-500" />
                        <span>
                          {completedSubtasks} / {totalSubtasks} {t('kanban.checklistItems')}
                        </span>
                      </p>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>{t('kanban.milestoneProgress')}</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-muted dark:bg-card h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${task.progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : t('kanban.noLimit')}</span>
                      </span>
                      <select
                        onClick={(e) => e.stopPropagation()}
                        value={task.status}
                        onChange={(e) => onStatusChange(task.id, e.target.value)}
                        className="bg-transparent border-none text-muted-foreground font-bold focus:outline-none hover:text-primary"
                      >
                        <option value="TODO">{t('kanban.statusSelect.TODO')}</option>
                        <option value="IN_PROGRESS">{t('kanban.statusSelect.IN_PROGRESS')}</option>
                        <option value="REVIEW">{t('kanban.statusSelect.REVIEW')}</option>
                        <option value="COMPLETED">{t('kanban.statusSelect.COMPLETED')}</option>
                      </select>
                    </div>
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <div className="text-center py-6 text-[10px] text-muted-foreground border border-dashed rounded-xl">
                  {t('kanban.dragTasksHere')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
