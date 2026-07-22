'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Calendar as CalendarIcon, 
  Gift, 
  Video, 
  FileText, 
  AlertCircle,
  Clock,
  Compass,
  Trello,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../services/api';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Filters State
  const [filters, setFilters] = useState({
    company: true,
    team: true,
    leave: true,
    meeting: true,
    birthday: true,
  });

  // Queries
  const { data: directoryData } = useQuery({
    queryKey: ['calendar-directory'],
    queryFn: () => api.getDirectory('limit=100'),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['calendar-tasks'],
    queryFn: () => api.getTasks('limit=100'),
  });

  const { data: announcementsData } = useQuery({
    queryKey: ['calendar-announcements'],
    queryFn: () => api.getAnnouncements('limit=100'),
  });

  const { data: meetingsData } = useQuery({
    queryKey: ['calendar-meetings'],
    queryFn: () => api.getMeetings(),
  });

  const colleagues = directoryData?.users || [];
  const tasks = tasksData?.tasks || [];
  const announcements = announcementsData?.announcements || [];
  const meetings = meetingsData || [];

  // Helper: Get deterministic birthday based on userId
  const getColleagueBirthday = (userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const month = Math.abs(hash % 12);
    const day = Math.abs((hash >> 3) % 28) + 1;
    return { month, day };
  };

  // Helper: Get deterministic leave calendar based on userId (only active if u.status is ON_LEAVE)
  const getColleagueLeave = (userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const startDay = Math.abs(hash % 20) + 1;
    const duration = Math.abs((hash >> 2) % 6) + 3; // 3 to 8 days
    return { startDay, endDay: startDay + duration };
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Build Events for Calendar Day
  const getEventsForDay = (day: number) => {
    const dayEvents: any[] = [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 1. Company Calendar (Announcements & Organizational events)
    if (filters.company) {
      announcements.forEach((a: any) => {
        const aDate = new Date(a.createdAt);
        if (
          aDate.getFullYear() === year &&
          aDate.getMonth() === month &&
          aDate.getDate() === day
        ) {
          dayEvents.push({
            id: `ann-${a.id}`,
            type: 'company',
            title: a.title,
            description: a.content,
            color: 'bg-info text-white',
            dotColor: 'bg-info',
            icon: Compass,
            meta: `Posted by: Org Announcements`,
          });
        }
      });
    }

    // 2. Team Calendar (Tasks)
    if (filters.team) {
      tasks.forEach((t: any) => {
        if (t.dueDate) {
          const tDate = new Date(t.dueDate);
          if (
            tDate.getFullYear() === year &&
            tDate.getMonth() === month &&
            tDate.getDate() === day
          ) {
            dayEvents.push({
              id: `task-${t.id}`,
              type: 'team',
              title: t.title,
              description: t.description || 'No description specified.',
              color: 'bg-emerald-500 text-white',
              dotColor: 'bg-emerald-500',
              icon: Trello,
              meta: `Assignee ID: ${t.assigneeId || 'Unassigned'} • Priority: ${t.priority}`,
            });
          }
        }
      });
    }

    // 3. Meeting Calendar (Meetings) — scheduled meetings plot on their scheduled
    // date; instant "start now" meetings (no scheduledFor) plot on the day they
    // were created, since that's the only date we have for those.
    if (filters.meeting) {
      meetings.forEach((m: any) => {
        const mDate = new Date(m.scheduledFor || m.createdAt);
        if (
          mDate.getFullYear() === year &&
          mDate.getMonth() === month &&
          mDate.getDate() === day
        ) {
          const time = mDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          dayEvents.push({
            id: `meet-${m.id}`,
            type: 'meeting',
            title: m.title || 'Video Conference',
            description: m.scheduledFor
              ? `Scheduled for ${time}${m.durationMins ? ` (${m.durationMins} min)` : ''}. Access code: ${m.code}`
              : `Instant video meeting. Access code: ${m.code}`,
            color: 'bg-primary text-white',
            dotColor: 'bg-primary',
            icon: Video,
            meta: `Host: ${m.host?.firstName} ${m.host?.lastName} • Code: ${m.code}`,
            link: `/meetings?code=${m.code}`,
          });
        }
      });
    }

    // 4. Birthday Calendar
    if (filters.birthday) {
      colleagues.forEach((u: any) => {
        const bday = getColleagueBirthday(u.id);
        if (bday.month === month && bday.day === day) {
          dayEvents.push({
            id: `bday-${u.id}`,
            type: 'birthday',
            title: `🎂 Birthday: ${u.firstName} ${u.lastName}`,
            description: `Wish ${u.firstName} ${u.lastName} (${u.designation || 'Teammate'}) a wonderful birthday!`,
            color: 'bg-pink-500 text-white',
            dotColor: 'bg-pink-500',
            icon: Gift,
            meta: `Department: ${u.department?.name || 'General Org'}`,
          });
        }
      });
    }

    // 5. Leave Calendar
    if (filters.leave) {
      colleagues.forEach((u: any) => {
        if (u.status === 'ON_LEAVE') {
          const leave = getColleagueLeave(u.id);
          if (day >= leave.startDay && day <= leave.endDay) {
            dayEvents.push({
              id: `leave-${u.id}-${day}`,
              type: 'leave',
              title: `🏖️ Out of Office: ${u.firstName}`,
              description: `${u.firstName} ${u.lastName} is currently on leave.`,
              color: 'bg-amber-500 text-white',
              dotColor: 'bg-amber-500',
              icon: Clock,
              meta: `Role: ${u.role} • Status: On Leave`,
            });
          }
        }
      });
    }

    return dayEvents;
  };

  // Generate Month Matrix
  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const matrix = [...blanks, ...days];

  return (
    <div className="space-y-6 text-left p-1">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Organizational Calendar</h1>
          <p className="text-xs text-muted-foreground font-semibold">Coordinate deadlines, scheduled leaves, meetings, and team schedules in a unified view.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SIDE PANEL: CALENDAR LEGENDS & FILTER CONTROLS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200">Calendar Filters</h3>
            <p className="text-[10px] text-slate-400">Toggle feeds displayed on your calendar matrix grid.</p>
          </div>

          <div className="space-y-3">
            {[
              { key: 'company', label: 'Company Calendar', color: 'bg-info', desc: 'Org holidays & Announcements' },
              { key: 'team', label: 'Team Calendar', color: 'bg-emerald-500', desc: 'Assigned task deadlines' },
              { key: 'leave', label: 'Leave Calendar', color: 'bg-amber-500', desc: 'Teammates out of office' },
              { key: 'meeting', label: 'Meeting Calendar', color: 'bg-primary', desc: 'Scheduled conference rooms' },
              { key: 'birthday', label: 'Birthday Calendar', color: 'bg-pink-500', desc: 'Colleague birthdays' },
            ].map((item) => (
              <label 
                key={item.key} 
                className="flex items-start space-x-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 p-2 rounded-xl transition-all"
              >
                <input
                  type="checkbox"
                  checked={(filters as any)[item.key]}
                  onChange={(e) => setFilters({ ...filters, [item.key]: e.target.checked })}
                  className="mt-1 rounded border-slate-350 text-primary focus:ring-primary h-4 w-4 shrink-0"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className={`h-2 w-2 rounded-full ${item.color}`} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* MAIN CALENDAR COMPONENT */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          {/* Calendar Controller Header */}
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              {monthNames[month]} {year}
            </h2>
            <div className="flex items-center space-x-1.5">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border transition-all"
              >
                Today
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Month Calendar Grid Matrix */}
          <div className="grid grid-cols-7 gap-1 border-t dark:border-slate-800 pt-3">
            {/* Week Labels */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-[10px] font-black uppercase text-slate-400 py-1.5">
                {d}
              </div>
            ))}

            {/* Matrix Cells */}
            {matrix.map((day, idx) => {
              if (day === null) {
                return (
                  <div 
                    key={`blank-${idx}`} 
                    className="h-28 bg-slate-50/20 dark:bg-slate-800/10 rounded-2xl border border-transparent" 
                  />
                );
              }

              const dayEvents = getEventsForDay(day);
              const isToday = 
                new Date().getDate() === day && 
                new Date().getMonth() === month && 
                new Date().getFullYear() === year;

              return (
                <div 
                  key={`day-${day}`}
                  className={`h-28 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-all hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md ${
                    isToday ? 'bg-primary/5 border-primary/20 dark:border-primary/30' : 'bg-transparent'
                  }`}
                >
                  {/* Day Date Label */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold flex items-center justify-center h-5 w-5 rounded-full ${
                      isToday ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-350'
                    }`}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-black text-slate-500">
                        {dayEvents.length} items
                      </span>
                    )}
                  </div>

                  {/* Day Events Dots/Mini-lists */}
                  <div className="flex-1 overflow-y-auto space-y-1 mt-1.5 pr-0.5 scrollbar-none text-[8px] leading-tight text-left">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left truncate px-1 py-0.5 rounded font-semibold transition-all hover:opacity-90 ${ev.color}`}
                      >
                        {ev.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[7px] text-slate-400 italic text-center font-semibold">
                        + {dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* EVENT DETAILS OVERLAY DRAWER MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative text-left">
            <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute right-4 top-4 text-slate-500 hover:bg-slate-105 p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 border-b pb-3.5">
              <div className={`p-2.5 rounded-xl ${selectedEvent.color}`}>
                <selectedEvent.icon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                  {selectedEvent.type} FEED
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                  {selectedEvent.title}
                </h3>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px] block">Details & Scope</label>
                <p className="text-slate-650 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="flex items-center space-x-2 text-[10px] text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 px-3 py-2 rounded-xl border border-dashed">
                <AlertCircle className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                <span>{selectedEvent.meta}</span>
              </div>

              {selectedEvent.link && (
                <Link
                  href={selectedEvent.link}
                  onClick={() => setSelectedEvent(null)}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold shadow-md transition-all text-center"
                >
                  <Video className="h-4 w-4" />
                  <span>Launch Collaborative Call</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline fallback X icon to avoid import delays
function X({ className, ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
