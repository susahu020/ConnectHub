import React from 'react';
import { CalendarFilters } from './eventBuilder';

const FILTER_ITEMS = [
  { key: 'company', label: 'Company Calendar', color: 'bg-info', desc: 'Org holidays & Announcements' },
  { key: 'team', label: 'Team Calendar', color: 'bg-emerald-500', desc: 'Assigned task deadlines' },
  { key: 'leave', label: 'Leave Calendar', color: 'bg-amber-500', desc: 'Teammates out of office' },
  { key: 'meeting', label: 'Meeting Calendar', color: 'bg-primary', desc: 'Scheduled conference rooms' },
  { key: 'birthday', label: 'Birthday Calendar', color: 'bg-pink-500', desc: 'Colleague birthdays' },
] as const;

export function CalendarFilterPanel({
  filters,
  onChange,
}: {
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-6">
      <div className="space-y-1">
        <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200">Calendar Filters</h3>
        <p className="text-[10px] text-slate-400">Toggle feeds displayed on your calendar matrix grid.</p>
      </div>

      <div className="space-y-3">
        {FILTER_ITEMS.map((item) => (
          <label
            key={item.key}
            className="flex items-start space-x-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 p-2 rounded-xl transition-all"
          >
            <input
              type="checkbox"
              checked={filters[item.key]}
              onChange={(e) => onChange({ ...filters, [item.key]: e.target.checked })}
              className="mt-1 rounded border-slate-350 text-primary focus:ring-primary h-4 w-4 shrink-0"
            />
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className={`h-2 w-2 rounded-full ${item.color}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{item.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
