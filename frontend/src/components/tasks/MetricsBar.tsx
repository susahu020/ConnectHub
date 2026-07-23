import React from 'react';

export function MetricsBar({ filteredTasks }: { filteredTasks: any[] }) {
  const cards = [
    {
      label: 'Total Tasks',
      value: filteredTasks.length,
      icon: '📋',
      color: 'bg-info/5 dark:bg-info/10 text-info-dark dark:text-info border-info/15 dark:border-info/20',
    },
    {
      label: 'In Progress',
      value: filteredTasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
      icon: '⚡',
      color: 'bg-primary/5 text-primary border-primary/10',
    },
    {
      label: 'Overdue Tasks',
      value: filteredTasks.filter(
        (t: any) => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < new Date()
      ).length,
      icon: '⚠️',
      color: 'bg-red-50/50 dark:bg-red-950/15 text-red-500 border-red-100 dark:border-red-900/30',
    },
    {
      label: 'Logged Hours',
      value: `${(
        filteredTasks.reduce(
          (sum: number, t: any) => sum + (t.timeLogs?.reduce((s: number, l: any) => s + l.minutes, 0) || 0),
          0
        ) / 60
      ).toFixed(1)} hrs`,
      icon: '⏱️',
      color: 'bg-emerald-50/50 dark:bg-emerald-950/15 text-emerald-500 border-emerald-100 dark:border-emerald-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
      {cards.map((card, idx) => (
        <div key={idx} className={`p-4 border rounded-2xl flex items-center justify-between shadow-2xs ${card.color}`}>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-450">{card.label}</span>
            <p className="text-lg font-black tracking-tight leading-none">{card.value}</p>
          </div>
          <span className="text-xl leading-none">{card.icon}</span>
        </div>
      ))}
    </div>
  );
}
