import React from 'react';

export function TasksTab({ stats }: { stats: any }) {
  const { taskCompletion } = stats;

  const statusCards = [
    { label: 'TODO', count: taskCompletion.statusCounts.TODO, color: 'border-slate-200 bg-slate-500/10 text-slate-650' },
    { label: 'IN PROGRESS', count: taskCompletion.statusCounts.IN_PROGRESS, color: 'border-primary/20 bg-primary/10 text-primary' },
    { label: 'REVIEW', count: taskCompletion.statusCounts.REVIEW, color: 'border-amber-200 bg-amber-500/10 text-amber-600' },
    { label: 'COMPLETED', count: taskCompletion.statusCounts.COMPLETED, color: 'border-green-200 bg-green-500/10 text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusCards.map((stat, idx) => (
          <div key={idx} className={`border rounded-xl p-4 shadow-sm ${stat.color} flex flex-col justify-between h-20`}>
            <span className="text-[10px] font-black uppercase tracking-wider">{stat.label}</span>
            <span className="text-2xl font-black leading-none">{stat.count}</span>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Overall Completion Meter</span>
        <p className="text-5xl font-black text-slate-900 dark:text-white">{taskCompletion.completionRate}%</p>
        <p className="text-xs text-slate-500 mt-2">
          Of the {taskCompletion.totalTasks} total tasks assigned in the system, {taskCompletion.statusCounts.COMPLETED} have been
          completed. Average task resolution duration: <strong>{taskCompletion.avgTaskResolutionHours} hours</strong>.
        </p>
        <div className="w-full max-w-md bg-slate-100 dark:bg-slate-850 h-2.5 rounded-full overflow-hidden mt-6">
          <div className="bg-primary h-full" style={{ width: `${taskCompletion.completionRate}%` }} />
        </div>
      </div>
    </div>
  );
}
