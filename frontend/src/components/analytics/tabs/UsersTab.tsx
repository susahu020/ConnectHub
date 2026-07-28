import React from 'react';

export function UsersTab({ stats }: { stats: any }) {
  const { activeUsers } = stats;

  const statCards = [
    { label: 'ONLINE', count: activeUsers.statusCounts.ONLINE, color: 'bg-green-500' },
    { label: 'AWAY', count: activeUsers.statusCounts.AWAY, color: 'bg-amber-500' },
    { label: 'BUSY / DND', count: activeUsers.statusCounts.BUSY + activeUsers.statusCounts.DND, color: 'bg-rose-500' },
    { label: 'OFFLINE', count: activeUsers.statusCounts.OFFLINE, color: 'bg-slate-350 dark:bg-slate-650' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full shrink-0 ${stat.color}`} />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-black text-slate-800 dark:text-white leading-none mt-0.5">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-black text-slate-850 dark:text-white mb-4">WebSocket Session Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 dark:text-slate-350">
          <div className="space-y-2 border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-6">
            <div className="flex justify-between py-1">
              <span>Unique Connected Users</span>
              <span className="font-bold text-slate-850 dark:text-white">{activeUsers.activeSocketUsers}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Total Open WebSockets</span>
              <span className="font-bold text-slate-850 dark:text-white">{activeUsers.activeSocketConnections}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Average Sockets per User</span>
              <span className="font-bold text-slate-850 dark:text-white">
                {activeUsers.activeSocketUsers > 0 ? (activeUsers.activeSocketConnections / activeUsers.activeSocketUsers).toFixed(1) : 0}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between py-1">
              <span>Total Office Roster</span>
              <span className="font-bold text-slate-850 dark:text-white">{activeUsers.totalUsers} Members</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Connection Ratio</span>
              <span className="font-bold text-slate-850 dark:text-white">
                {activeUsers.totalUsers > 0 ? ((activeUsers.activeSocketUsers / activeUsers.totalUsers) * 100).toFixed(0) : 0}% Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
