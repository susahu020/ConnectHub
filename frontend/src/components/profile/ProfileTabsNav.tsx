import React from 'react';
import { User, Activity, Tag, Briefcase, GraduationCap, Shield } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'activity', label: 'Activity Timeline', icon: Activity },
  { id: 'skills', label: 'Expertise Skills', icon: Tag },
  { id: 'experience', label: 'Work Experience', icon: Briefcase },
  { id: 'education', label: 'Education & Certs', icon: GraduationCap },
  { id: 'security', label: 'Security & Sessions', icon: Shield },
];

export function ProfileTabsNav({ activeTab, onChange, isOwnProfile }: { activeTab: string; onChange: (tab: string) => void; isOwnProfile: boolean }) {
  // Security & Sessions exposes this person's 2FA status and (via the tab's
  // own "Go to Settings Console" link) session/device management — account
  // security posture that's nobody's business but the account owner's, so
  // it's left out of the tab list entirely when viewing a colleague.
  const visibleTabs = isOwnProfile ? TABS : TABS.filter((tab) => tab.id !== 'security');

  return (
    <div className="lg:col-span-1 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-4 space-y-1.5 shadow-sm">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all text-xs font-bold ${
              active ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
