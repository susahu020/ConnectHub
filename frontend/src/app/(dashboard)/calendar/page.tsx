'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { getEventsForDay, CalendarFilters } from '../../../components/calendar/eventBuilder';
import { CalendarFilterPanel } from '../../../components/calendar/CalendarFilterPanel';
import { CalendarMonthGrid } from '../../../components/calendar/CalendarMonthGrid';
import { CalendarEventModal } from '../../../components/calendar/CalendarEventModal';
import { QuickCreateEventModal } from '../../../components/calendar/QuickCreateEventModal';

export default function CalendarPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [quickCreateDate, setQuickCreateDate] = useState<Date | null>(null);

  const [filters, setFilters] = useState<CalendarFilters>({
    company: true,
    team: true,
    leave: true,
    meeting: true,
    birthday: true,
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

  // Previously birthdays and leave were entirely fabricated — deterministic
  // pseudo-random dates hashed from each colleague's user id, with a code
  // comment admitting "no real birthday data in this demo dataset". That
  // was simply wrong: User.birthday is a real, already-used field (there's
  // even an automatic birthday-wish-email feature built on it — see
  // backend/src/services/birthday.service.ts), and LeaveRequest is a real,
  // fully-featured approval system. This now uses both real sources
  // instead of making dates up.
  //
  // GET /hr/celebrations only ever returns birthdays for the *current*
  // calendar month (server-side, not parameterized by month) — so
  // navigating to a different month simply shows no birthdays there,
  // which is the honest behavior (nothing fabricated) even though it's
  // not yet a complete "any month" experience.
  const { data: celebrationsData } = useQuery({
    queryKey: ['calendar-celebrations'],
    queryFn: () => api.getCelebrations(),
  });

  // GET /hr/leaves is already scoped by the viewer's role (their own leave,
  // or their team's if they're a Manager/Admin — see hr.controller.ts's
  // getLeaves / getVisibleUserIds), so an individual contributor will only
  // ever see their own leave on this calendar, not the whole company's —
  // consistent with how leave visibility already works everywhere else in
  // this app.
  const { data: leavesData } = useQuery({
    queryKey: ['calendar-leaves'],
    queryFn: () => api.getLeaves(),
  });

  const tasks = tasksData?.tasks || [];
  const announcements = announcementsData?.announcements || [];
  const meetings = meetingsData || [];
  const birthdays = celebrationsData?.birthdays || [];
  const leaves = leavesData || [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const matrix = [...blanks, ...days];

  const createTaskMutation = useMutation({
    mutationFn: (body: any) => api.createTask(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setQuickCreateDate(null);
      toast.success('Task created.');
    },
    onError: (err: any) => toast.error(err?.message || 'Could not create task.'),
  });

  const scheduleMeetingMutation = useMutation({
    mutationFn: (body: any) => api.scheduleMeeting(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-meetings'] });
      setQuickCreateDate(null);
      toast.success('Meeting scheduled.');
    },
    onError: (err: any) => toast.error(err?.message || 'Could not schedule meeting.'),
  });

  const handleQuickCreateTask = (title: string) => {
    if (!quickCreateDate || !user?.id) return;
    createTaskMutation.mutate({
      title,
      assigneeId: user.id,
      dueDate: quickCreateDate.toISOString(),
    });
  };

  const handleQuickCreateMeeting = (title: string, time: string) => {
    if (!quickCreateDate) return;
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledFor = new Date(quickCreateDate);
    scheduledFor.setHours(hours || 0, minutes || 0, 0, 0);
    scheduleMeetingMutation.mutate({
      title,
      scheduledFor: scheduledFor.toISOString(),
      inviteeIds: [],
    });
  };

  return (
    <div className="space-y-6 text-left p-1">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Organizational Calendar</h1>
          <p className="text-xs text-muted-foreground font-semibold">
            Coordinate deadlines, scheduled leaves, meetings, and team schedules in a unified view.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <CalendarFilterPanel filters={filters} onChange={setFilters} />

        <CalendarMonthGrid
          year={year}
          month={month}
          matrix={matrix}
          getEventsForDay={(day) =>
            getEventsForDay({ year, month, day, filters, announcements, tasks, meetings, birthdays, leaves })
          }
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={() => setCurrentDate(new Date())}
          onSelectEvent={setSelectedEvent}
          onQuickCreate={setQuickCreateDate}
        />
      </div>

      {selectedEvent && <CalendarEventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}

      {quickCreateDate && (
        <QuickCreateEventModal
          date={quickCreateDate}
          onClose={() => setQuickCreateDate(null)}
          onCreateTask={handleQuickCreateTask}
          onCreateMeeting={handleQuickCreateMeeting}
          submitting={createTaskMutation.isPending || scheduleMeetingMutation.isPending}
        />
      )}
    </div>
  );
}
