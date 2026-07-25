import React from 'react';
import { Search } from 'lucide-react';

const TYPE_FILTERS = [
  { id: 'ALL', label: 'All Files' },
  { id: 'IMAGES', label: 'Images' },
  { id: 'VIDEOS', label: 'Videos' },
  { id: 'DOCUMENTS', label: 'Documents' },
] as const;

export function FileFilterBar({
  searchQuery,
  onSearchQueryChange,
  fileTypeFilter,
  onFileTypeFilterChange,
}: {
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  fileTypeFilter: string;
  onFileTypeFilterChange: (v: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          placeholder="Filter documents and folders in this directory..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" strokeWidth={1.5} />
      </div>

      <div className="flex items-center space-x-1.5 overflow-x-auto text-[10px] font-extrabold uppercase shrink-0">
        {TYPE_FILTERS.map((type) => (
          <button
            key={type.id}
            onClick={() => onFileTypeFilterChange(type.id)}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              fileTypeFilter === type.id
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-foreground border-slate-200 dark:border-slate-700'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
}
