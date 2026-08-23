import React from 'react';
import { Calendar, Clock, CalendarDays, CreditCard, FileText, ArrowLeftRight, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CurvedTabs } from '../ui/CurvedTabs';

export type HRTabType = 'leave' | 'attendance' | 'holidays' | 'expenses' | 'payslips' | 'shifts' | 'recognition';

// label is the stable English fallback/dev-reference — actual display text
// comes from t(`hr.tabs.${tab.id}`) in the component below. Kept as a
// plain array (not defined inside the component) so it's not needlessly
// recreated on every render; translation happens at render time instead,
// same pattern as the Sidebar's NavItem.label fallback.
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
  const { t } = useTranslation();
  const translatedTabs = TABS.map((tab) => ({ ...tab, label: t(`hr.tabs.${tab.id}`) }));
  return (
    <CurvedTabs
      className="mb-8"
      tabs={translatedTabs}
      activeId={activeTab}
      onChange={(id) => onChange(id as HRTabType)}
    />
  );
}
