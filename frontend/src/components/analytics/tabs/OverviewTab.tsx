import React from 'react';
import { Users, MessageSquare, CheckCircle, Database, TrendingUp, PieChart } from 'lucide-react';
import { formatBytes } from '../formatBytes';

export function OverviewTab({ stats }: { stats: any }) {
  const { activeUsers, chatAnalytics, departmentProductivity, taskCompletion, fileUsage } = stats;

  const priorityColorMap: Record<string, string> = {
    LOW: 'bg-slate-400',
    NORMAL: 'bg-info',
    HIGH: 'bg-amber-500',
    URGENT: 'bg-rose-500',
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Members</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {activeUsers.activeSocketUsers} <span className="text-xs text-slate-400 font-bold">/ {activeUsers.totalUsers} online</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Live active socket connections: {activeUsers.activeSocketConnections}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chat Throughput</span>
            <MessageSquare className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{chatAnalytics.totalMessages.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">Total messages sent across {chatAnalytics.totalChannels} channels</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Completion</span>
            <CheckCircle className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{taskCompletion.completionRate}%</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {taskCompletion.statusCounts.COMPLETED} completed of {taskCompletion.totalTasks} tasks
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Storage Consumption</span>
            <Database className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{formatBytes(fileUsage.totalStorageBytes)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Allocated across {fileUsage.totalFiles} files</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
            Department Productivity Ranking
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </h4>
          <div className="space-y-4">
            {departmentProductivity.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No department metrics available.</p>
            ) : (
              departmentProductivity.map((dept: any, idx: number) => (
                <div key={dept.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span>
                      #{idx + 1} {dept.name} ({dept.totalMembers} staff)
                    </span>
                    <span>{dept.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${dept.completionRate}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {dept.completedTasks} completed / {dept.totalTasks} total tasks
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
            Task Priority Distribution
            <PieChart className="h-4 w-4 text-slate-400" />
          </h4>
          <div className="space-y-4">
            {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((priority) => {
              const count = taskCompletion.priorityCounts[priority] || 0;
              const pct = taskCompletion.totalTasks > 0 ? ((count / taskCompletion.totalTasks) * 100).toFixed(0) : '0';
              return (
                <div key={priority} className="flex items-center gap-4">
                  <span className="w-16 text-right text-xs font-bold text-slate-400">{priority}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-4 rounded-lg overflow-hidden flex items-center relative">
                    <div className={`${priorityColorMap[priority]} h-full`} style={{ width: `${pct}%` }} />
                    <span className="absolute left-2 text-[10px] font-black text-slate-850 dark:text-white leading-none">
                      {count} tasks ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
