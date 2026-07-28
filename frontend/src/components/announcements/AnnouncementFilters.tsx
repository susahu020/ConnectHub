import React from 'react';
import { Search } from 'lucide-react';

export function AnnouncementFilters({
  searchQuery,
  onSearchQueryChange,
  filterPriority,
  onFilterPriorityChange,
}: {
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  filterPriority: string;
  onFilterPriorityChange: (v: string) => void;
}) {
  const hasActiveFilters = searchQuery || filterPriority !== 'ALL';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-2xs text-xs font-bold text-slate-700 dark:text-slate-350">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search notices by title/content..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" strokeWidth={1.5} />
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] text-slate-400 uppercase">Priority:</span>
          <select
            value={filterPriority}
            onChange={(e) => onFilterPriorityChange(e.target.value)}
            className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={() => {
            onSearchQueryChange('');
            onFilterPriorityChange('ALL');
          }}
          className="px-3 py-1.5 text-slate-500 hover:text-slate-805 text-xs transition-all font-semibold"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
