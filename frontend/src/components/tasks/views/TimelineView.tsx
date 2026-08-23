import React from 'react';

export function TimelineView({
  filteredTasks,
  onOpenTaskDetail,
}: {
  filteredTasks: any[];
  onOpenTaskDetail: (task: any) => void;
}) {
  const sorted = [...filteredTasks].sort((a, b) => {
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return dateA - dateB;
  });

  return (
    <div className="bg-card dark:bg-card border rounded-2xl shadow-sm p-6 space-y-6 max-h-[70vh] overflow-y-auto pr-1 animate-fade-in text-left">
      <div className="border-b pb-4 flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-black text-sm uppercase tracking-wide text-foreground dark:text-foreground">
            Project Schedule Timeline
          </h3>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            Chronological list of pipeline milestones and task deadlines
          </p>
        </div>
      </div>

      <div className="relative pl-6 border-l-2 border-border dark:border-border space-y-6">
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground italic pl-2">No tasks available in this project timeline.</p>
        ) : (
          sorted.map((task) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
            return (
              <div key={task.id} className="relative group">
                <span
                  className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-card dark:bg-card transition-all ${
                    task.status === 'COMPLETED' ? 'border-green-500 bg-green-500' : isOverdue ? 'border-red-500 bg-red-500' : 'border-primary'
                  }`}
                />

                <div
                  onClick={() => onOpenTaskDetail(task)}
                  className="p-4 border rounded-2xl bg-muted/40 dark:bg-card/10 hover:bg-muted dark:hover:bg-card hover:shadow-xs transition-all cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0"
                >
                  <div className="space-y-1.5 max-w-lg">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-extrabold text-sm text-foreground dark:text-foreground leading-tight">{task.title}</h4>
                      {task.sprintName && (
                        <span className="px-1.5 py-0.5 bg-info/10 dark:bg-info/15 text-info-dark dark:text-info border border-info/20 rounded text-[9px] font-extrabold uppercase">
                          {task.sprintName}
                        </span>
                      )}
                      {task.milestoneName && (
                        <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 rounded text-[9px] font-extrabold uppercase">
                          🎯 {task.milestoneName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{task.description || 'No description provided.'}</p>
                    {task.labels && task.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {task.labels.map((l: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-muted dark:bg-card text-muted-foreground dark:text-foreground rounded-full text-[9px] font-bold">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-6 text-[10px] text-muted-foreground font-semibold shrink-0">
                    <div className="text-right">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase">Deadline</span>
                      <span className={isOverdue ? 'text-red-500 font-bold' : ''}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase">Progress</span>
                      <span className="font-extrabold text-foreground dark:text-foreground">{task.progress}%</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                        task.status === 'COMPLETED'
                          ? 'text-green-500 bg-green-50 border-green-200'
                          : task.status === 'IN_PROGRESS'
                          ? 'text-primary bg-primary/5 border-primary/20'
                          : task.status === 'REVIEW'
                          ? 'text-orange-500 bg-orange-50 border-orange-200'
                          : 'text-muted-foreground bg-muted border-border'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
