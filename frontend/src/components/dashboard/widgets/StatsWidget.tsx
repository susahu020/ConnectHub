import React from 'react';
import { Activity, MessageSquare, Bell, Trello, Users } from 'lucide-react';
import { WidgetHeader } from '../WidgetHeader';

function StatTile({
  icon,
  gradient,
  glow,
  tint,
  border,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  gradient: string;
  glow: string;
  tint: string;
  border: string;
  label: string;
  value: React.ReactNode;
  valueClassName: string;
}) {
  return (
    <div className={`flex items-center gap-4 p-3 ${tint} border ${border} rounded-2xl transition-all duration-300 hover:shadow-md`}>
      <div className={`p-3 bg-gradient-to-tr ${gradient} text-white rounded-xl shadow-lg ${glow} shrink-0 [&>svg]:h-5 [&>svg]:w-5`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">{label}</p>
        <p className={`text-xl font-black leading-none mt-2 ${valueClassName}`}>{value}</p>
      </div>
    </div>
  );
}

export function StatsWidget({ stats }: { stats: any }) {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <WidgetHeader icon={<Activity />} title="Key Metrics" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          icon={<MessageSquare />}
          gradient="from-info to-primary"
          glow="shadow-info/20"
          tint="bg-info/5 dark:bg-info/10"
          border="border-info/15 dark:border-info/20"
          label="Unread DMs"
          value={stats?.unreadMessages || 0}
          valueClassName="text-info-dark dark:text-info"
        />
        <StatTile
          icon={<Bell />}
          gradient="from-rose-500 to-red-600"
          glow="shadow-rose-500/20"
          tint="bg-rose-50/50 dark:bg-rose-950/20"
          border="border-rose-100/50 dark:border-rose-900/30"
          label="Alerts"
          value={stats?.unreadNotifications || 0}
          valueClassName="text-rose-600 dark:text-rose-400"
        />
        <StatTile
          icon={<Trello />}
          gradient="from-emerald-500 to-teal-600"
          glow="shadow-emerald-500/20"
          tint="bg-emerald-50/50 dark:bg-emerald-950/20"
          border="border-emerald-100/50 dark:border-emerald-900/30"
          label="My Tasks"
          value={stats?.pendingTasksCount || 0}
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <StatTile
          icon={<Users />}
          gradient="from-amber-500 to-orange-600"
          glow="shadow-amber-500/20"
          tint="bg-amber-50/50 dark:bg-amber-950/20"
          border="border-amber-100/50 dark:border-amber-900/30"
          label="Online Users"
          value={stats?.onlineEmployees || 0}
          valueClassName="text-amber-600 dark:text-amber-400"
        />
      </div>
    </div>
  );
}
