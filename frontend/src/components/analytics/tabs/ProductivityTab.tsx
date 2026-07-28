import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

export function ProductivityTab({ stats }: { stats: any }) {
  const { departmentProductivity, taskCompletion, productivityMetrics } = stats;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Employee Engagement</span>
          <div className="relative h-24 w-24 flex items-center justify-center mb-3">
            <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-primary"
                strokeDasharray={`${productivityMetrics.engagementScore}, 100`}
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{productivityMetrics.engagementScore}%</span>
          </div>
          <p className="text-xs text-slate-505 dark:text-slate-400 font-semibold leading-relaxed">
            Composite engagement score based on kudos, logs, and meeting activity.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Chat Response Speed</span>
          <div className="relative h-24 w-24 flex items-center justify-center mb-3 bg-emerald-500/10 text-emerald-500 rounded-full">
            <Clock className="h-10 w-10" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{productivityMetrics.avgChatResponseMinutes} mins</p>
          <p className="text-xs text-slate-505 dark:text-slate-400 mt-2 font-semibold">Average duration to reply to direct DM messages.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Task Resolution Time</span>
          <div className="relative h-24 w-24 flex items-center justify-center mb-3 bg-indigo-500/10 text-indigo-500 rounded-full">
            <CheckCircle className="h-10 w-10" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{productivityMetrics.avgTaskResolutionHours} hrs</p>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-2 font-semibold">Average time from task creation to COMPLETED state.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Department Performance Overview</h4>
          <div className="space-y-4">
            {departmentProductivity.map((dept: any) => (
              <div key={dept.id} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                  <span>{dept.name}</span>
                  <span>
                    {dept.completedTasks} / {dept.totalTasks} completed ({dept.completionRate}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${dept.completionRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-center text-left">
          <h4 className="text-sm font-black text-slate-850 dark:text-white mb-4">Productivity Analysis</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            A healthy workspace resolves tasks in under 24 hours and maintains a message response rate below 15 minutes. Currently, the
            team maintains an overall completion rate of <strong>{taskCompletion.completionRate}%</strong> with a composite engagement
            score of <strong>{productivityMetrics.engagementScore}%</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
