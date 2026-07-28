import React from 'react';

export function AnnouncementMetricsBar({ announcements }: { announcements: any[] | undefined }) {
  const cards = [
    {
      label: 'Total Bulletins',
      value: announcements?.length || 0,
      icon: '📢',
      color: 'bg-info/5 dark:bg-info/10 text-info-dark dark:text-info border-info/15 dark:border-info/20',
    },
    {
      label: 'Total Views',
      value: announcements?.reduce((acc: number, cur: any) => acc + (cur.viewsCount || 0), 0) || 0,
      icon: '👁️',
      color: 'bg-primary/5 text-primary border-primary/10',
    },
    {
      label: 'Urgent Notices',
      value: announcements?.filter((a: any) => a.priority === 'URGENT').length || 0,
      icon: '🔥',
      color: 'bg-red-50/50 dark:bg-red-950/15 text-red-500 border-red-100 dark:border-red-900/30',
    },
    {
      label: 'Pinned bulletins',
      value: announcements?.filter((a: any) => a.isPinned).length || 0,
      icon: '📌',
      color: 'bg-amber-50/50 dark:bg-amber-950/15 text-amber-500 border-amber-100 dark:border-amber-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
      {cards.map((card, idx) => (
        <div key={idx} className={`p-4 border rounded-2xl flex items-center justify-between shadow-2xs bg-white dark:bg-slate-900`}>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-450">{card.label}</span>
            <p className="text-lg font-black tracking-tight leading-none text-slate-800 dark:text-slate-205">{card.value}</p>
          </div>
          <span className="text-xl leading-none">{card.icon}</span>
        </div>
      ))}
    </div>
  );
}
