import React from 'react';
import { TrendingUp } from 'lucide-react';
import { WidgetHeader } from '../WidgetHeader';

export function PerformanceWidget({
  productivityScore,
  completedTasks,
  totalTasks,
}: {
  productivityScore: number;
  completedTasks: number;
  totalTasks: number;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <WidgetHeader icon={<TrendingUp />} iconClassName="text-indigo-500" title="Workspace Productivity" />

      <div className="flex items-center justify-around gap-6 pt-2">
        <div className="relative h-24 w-24 flex items-center justify-center shrink-0">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2F80ED" />
                <stop offset="100%" stopColor="#5750E8" />
              </linearGradient>
            </defs>
            <path
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="transition-all duration-1000"
              strokeDasharray={`${productivityScore}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="url(#scoreGrad)"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="text-center">
            <span className="text-base font-black leading-none text-transparent bg-clip-text bg-gradient-to-r from-info to-primary">
              {productivityScore}%
            </span>
            <p className="text-[9px] text-muted-foreground uppercase font-bold leading-none mt-1">Score</p>
          </div>
        </div>

        <div className="space-y-3 flex-1">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold">
              <span>Tasks Completed</span>
              <span>
                {completedTasks} / {totalTasks}
              </span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full"
                style={{ width: `${productivityScore}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold">
              <span>Drive Space</span>
              <span>4.2 GB / 10 GB</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                style={{ width: '42%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
