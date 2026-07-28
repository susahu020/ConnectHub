import React from 'react';
import { Layers, Activity, Users, MessageSquare, TrendingUp, CheckCircle, Folder } from 'lucide-react';

export type SubTabType = 'overview' | 'productivity' | 'users' | 'chat' | 'departments' | 'tasks' | 'files';

const TABS: { id: SubTabType; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Layers className="h-4 w-4" /> },
  { id: 'productivity', label: 'Productivity', icon: <Activity className="h-4 w-4" /> },
  { id: 'users', label: 'Active Users', icon: <Users className="h-4 w-4" /> },
  { id: 'chat', label: 'Chat Activity', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'departments', label: 'Department Output', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'tasks', label: 'Tasks Metric', icon: <CheckCircle className="h-4 w-4" /> },
  { id: 'files', label: 'File Storage', icon: <Folder className="h-4 w-4" /> },
];

export function AnalyticsTabs({ activeTab, onChange }: { activeTab: SubTabType; onChange: (tab: SubTabType) => void }) {
  return (
    <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto scrollbar-none gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold whitespace-nowrap transition-all duration-200 leading-none ${
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650 hover:border-slate-200 dark:hover:border-slate-800'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
