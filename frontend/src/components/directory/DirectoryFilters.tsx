import React from 'react';
import { Search, Grid, List } from 'lucide-react';

export function DirectoryFilters({
  search,
  onSearchChange,
  location,
  onLocationChange,
  status,
  onStatusChange,
  viewMode,
  onViewModeChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  viewMode: 'GRID' | 'LIST';
  onViewModeChange: (v: 'GRID' | 'LIST') => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border p-4 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 font-semibold text-xs text-muted-foreground items-end">
      <div className="space-y-1 text-left">
        <label className="uppercase text-[10px] tracking-wider">Search Name, Role, or Skill</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="e.g. Alice, React, Designer..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
          />
        </div>
      </div>

      <div className="space-y-1 text-left">
        <label className="uppercase text-[10px] tracking-wider">Office / City Location</label>
        <input
          type="text"
          placeholder="e.g. New York, HQ..."
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
        />
      </div>

      <div className="space-y-1 text-left">
        <label className="uppercase text-[10px] tracking-wider">Availability Status</label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="ONLINE">Online</option>
          <option value="AWAY">Away</option>
          <option value="BUSY">Busy</option>
          <option value="DND">Do Not Disturb</option>
          <option value="IN_MEETING">In Meeting</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>

      <div className="space-y-1 text-left">
        <label className="uppercase text-[10px] tracking-wider">View Mode</label>
        <div className="flex border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 text-xs font-bold shadow-xs h-[38px] items-center p-1 space-x-1 border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onViewModeChange('GRID')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              viewMode === 'GRID' ? 'bg-white dark:bg-slate-900 text-primary shadow-xs' : 'text-slate-500 hover:text-foreground'
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('LIST')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              viewMode === 'LIST' ? 'bg-white dark:bg-slate-900 text-primary shadow-xs' : 'text-slate-500 hover:text-foreground'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>
    </div>
  );
}
