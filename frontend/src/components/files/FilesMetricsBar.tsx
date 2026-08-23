import React from 'react';

export function FilesMetricsBar({ explorer, fileTypeFilter }: { explorer: any; fileTypeFilter: string }) {
  const cards = [
    {
      label: 'Total Folders',
      value: explorer?.folders?.length || 0,
      icon: '📁',
      color: 'bg-info/5 dark:bg-info/10 text-info-dark dark:text-info border-info/15 dark:border-info/20',
    },
    { label: 'Total Files', value: explorer?.files?.length || 0, icon: '📄', color: 'bg-primary/5 text-primary border-primary/10' },
    {
      label: 'Storage Used',
      value: `${((explorer?.files?.reduce((acc: number, f: any) => acc + (f.size || 0), 0) || 0) / 1024 / 1024).toFixed(1)} MB`,
      icon: '💾',
      color: 'bg-emerald-50/50 dark:bg-emerald-950/15 text-emerald-500 border-emerald-100 dark:border-emerald-900/30',
    },
    {
      label: 'File Type Filter',
      value: fileTypeFilter === 'ALL' ? 'All Types' : fileTypeFilter,
      icon: '🔍',
      color: 'bg-amber-50/50 dark:bg-amber-950/15 text-amber-500 border-amber-100 dark:border-amber-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
      {cards.map((card, idx) => (
        <div key={idx} className="p-4 border rounded-2xl flex items-center justify-between shadow-2xs bg-card dark:bg-card">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">{card.label}</span>
            <p className="text-lg font-black tracking-tight leading-none text-foreground dark:text-foreground">{card.value}</p>
          </div>
          <span className="text-xl leading-none">{card.icon}</span>
        </div>
      ))}
    </div>
  );
}
