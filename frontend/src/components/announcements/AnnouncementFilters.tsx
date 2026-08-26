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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-card dark:bg-card border rounded-2xl shadow-2xs text-xs font-bold text-foreground dark:text-foreground">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search notices by title/content..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-muted dark:bg-card border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" strokeWidth={1.5} />
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] text-muted-foreground uppercase">Priority:</span>
          <select
            value={filterPriority}
            onChange={(e) => onFilterPriorityChange(e.target.value)}
            className="px-2.5 py-1.5 border rounded-lg bg-muted dark:bg-card focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
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
          className="px-3 py-1.5 text-muted-foreground hover:text-foreground text-xs transition-all font-semibold"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
