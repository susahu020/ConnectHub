import React from 'react';
import { Layers, Activity, Users, MessageSquare, TrendingUp, CheckCircle, Folder } from 'lucide-react';
import { CurvedTabs } from '../ui/CurvedTabs';

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
    <CurvedTabs
      className="mb-8"
      tabs={TABS}
      activeId={activeTab}
      onChange={(id) => onChange(id as SubTabType)}
    />
  );
}
