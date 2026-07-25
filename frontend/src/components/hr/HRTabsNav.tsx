import React from 'react';
import { Calendar, Clock, CalendarDays, CreditCard, FileText, ArrowLeftRight, Award } from 'lucide-react';

export type HRTabType = 'leave' | 'attendance' | 'holidays' | 'expenses' | 'payslips' | 'shifts' | 'recognition';

const TABS: { id: HRTabType; label: string; icon: React.ReactNode }[] = [
  { id: 'leave', label: 'Leave', icon: <Calendar className="h-4 w-4" /> },
  { id: 'attendance', label: 'Attendance', icon: <Clock className="h-4 w-4" /> },
  { id: 'holidays', label: 'Holidays', icon: <CalendarDays className="h-4 w-4" /> },
  { id: 'expenses', label: 'Expenses', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'payslips', label: 'Payslips', icon: <FileText className="h-4 w-4" /> },
  { id: 'shifts', label: 'Shifts', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { id: 'recognition', label: 'Recognition', icon: <Award className="h-4 w-4" /> },
];

export function HRTabsNav({ activeTab, onChange }: { activeTab: HRTabType; onChange: (tab: HRTabType) => void }) {
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
