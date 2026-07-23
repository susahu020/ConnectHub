import React from 'react';

export function DirectoryMetricsBar({ users }: { users: any[] | undefined }) {
  const cards = [
    { label: 'Total Teammates', value: users?.length || 0, icon: '👥' },
    { label: 'Online Now', value: users?.filter((u: any) => u.status === 'ONLINE').length || 0, icon: '🟢' },
    {
      label: 'Active Depts',
      value: Array.from(new Set(users?.map((u: any) => u.department?.name).filter(Boolean))).length || 0,
      icon: '🏢',
    },
    {
      label: 'Office Locations',
      value: Array.from(new Set(users?.map((u: any) => u.officeLocation || u.location).filter(Boolean))).length || 0,
      icon: '📍',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
      {cards.map((card, idx) => (
        <div key={idx} className="p-4 border rounded-2xl flex items-center justify-between shadow-2xs bg-white dark:bg-slate-900">
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
