'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { getEventsForDay, CalendarFilters } from '../../../components/calendar/eventBuilder';
import { CalendarFilterPanel } from '../../../components/calendar/CalendarFilterPanel';
import { CalendarMonthGrid } from '../../../components/calendar/CalendarMonthGrid';
import { CalendarEventModal } from '../../../components/calendar/CalendarEventModal';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const [filters, setFilters] = useState<CalendarFilters>({
    company: true,
    team: true,
    leave: true,
    meeting: true,
    birthday: true,
  });

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const matrix = [...blanks, ...days];

  return (
    <div className="space-y-6 text-left p-1">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Organizational Calendar</h1>
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
            getEventsForDay({ year, month, day, filters, announcements, tasks, meetings, colleagues })
          }
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={() => setCurrentDate(new Date())}
          onSelectEvent={setSelectedEvent}
        />
      </div>

      {selectedEvent && <CalendarEventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
