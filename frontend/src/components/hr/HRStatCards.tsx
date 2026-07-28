import React from 'react';
import { Clock, Calendar, CalendarDays, Award } from 'lucide-react';

export function HRStatCards({
  todayAttendance,
  balances,
  shiftAssignments,
  recognitions,
  currentUserId,
}: {
  todayAttendance: any;
  balances: any[];
  shiftAssignments: any[];
  recognitions: any[];
  currentUserId?: string;
}) {
  const annualBalance = balances.find((b: any) => b.leaveType === 'ANNUAL');

  const cards = [
    {
      label: 'Attendance Status',
      icon: Clock,
      color: 'bg-green-500/10 text-green-500',
      value: todayAttendance ? (todayAttendance.clockOut ? 'Clocked Out' : 'Active Duty') : 'Not Checked In',
      sub: todayAttendance?.clockIn
        ? `In: ${new Date(todayAttendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Ready to start your day',
    },
    {
      label: 'Available Leaves',
      icon: Calendar,
      color: 'bg-info/10 text-info',
      value: `${annualBalance ? annualBalance.total - annualBalance.used : 12} Days`,
      sub: 'Annual leave balance',
    },
    {
      label: 'Active Shift',
      icon: CalendarDays,
      color: 'bg-amber-500/10 text-amber-500',
      value: shiftAssignments[0]?.shift ? shiftAssignments[0].shift.name : 'Regular Shift',
      sub: shiftAssignments[0]?.shift ? `${shiftAssignments[0].shift.startTime} - ${shiftAssignments[0].shift.endTime}` : '09:00 AM - 05:00 PM',
    },
    {
      label: 'Recognitions Received',
      icon: Award,
      color: 'bg-purple-500/10 text-purple-500',
      value: `${recognitions.filter((r: any) => r.receiverId === currentUserId).length} Cheers`,
      sub: 'Kudos from your colleagues',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{card.label}</span>
            <div className={`p-2 rounded-xl ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{card.value}</p>
          <span className="text-xs text-slate-400 mt-1 block">{card.sub}</span>
        </div>
      ))}
    </div>
  );
}
