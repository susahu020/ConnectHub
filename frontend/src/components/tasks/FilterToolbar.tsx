import React from 'react';
import { Search, Download } from 'lucide-react';

export function FilterToolbar({
  searchQuery,
  onSearchQueryChange,
  filterPriority,
  onFilterPriorityChange,
  filterAssignee,
  onFilterAssigneeChange,
  colleagues,
  onExportCSV,
}: {
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  filterPriority: string;
  onFilterPriorityChange: (v: string) => void;
  filterAssignee: string;
  onFilterAssigneeChange: (v: string) => void;
  colleagues: any;
  onExportCSV: () => void;
}) {
  const hasActiveFilters = searchQuery || filterPriority !== 'ALL' || filterAssignee !== 'ALL';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-2xs text-xs font-bold text-slate-700 dark:text-slate-350">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search tasks by title/desc..."
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

        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] text-slate-400 uppercase">Assignee:</span>
          <select
            value={filterAssignee}
            onChange={(e) => onFilterAssigneeChange(e.target.value)}
            className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer max-w-[150px] truncate"
          >
            <option value="ALL">All Colleagues</option>
            {colleagues?.users?.map((col: any) => (
              <option key={col.id} value={col.id}>
                {col.firstName} {col.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {hasActiveFilters && (
          <button
            onClick={() => {
              onSearchQueryChange('');
              onFilterPriorityChange('ALL');
              onFilterAssigneeChange('ALL');
            }}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs transition-all font-semibold"
          >
            Clear Filters
          </button>
        )}
        <button
          onClick={onExportCSV}
          className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-xl flex items-center space-x-1.5 transition-all text-xs font-bold"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  );
}
