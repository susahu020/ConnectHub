import { Compass, Trello, Video, Gift, Clock } from 'lucide-react';

export interface CalendarFilters {
  company: boolean;
  team: boolean;
  leave: boolean;
  meeting: boolean;
  birthday: boolean;
}

export function getEventsForDay({
  year,
  month,
  day,
  filters,
  announcements,
  tasks,
  meetings,
  birthdays,
  leaves,
}: {
  year: number;
  month: number;
  day: number;
  filters: CalendarFilters;
  announcements: any[];
  tasks: any[];
  meetings: any[];
  /** From GET /hr/celebrations — real birthdays, only ever populated for
   *  the *current* calendar month (see calendar/page.tsx for why). */
  birthdays: any[];
  /** From GET /hr/leaves — real leave requests, already scoped to what
   *  the current user is allowed to see (their own, or their team's if
   *  they're a Manager/Admin — see hr.controller.ts's getLeaves). Every
   *  status is included here; callers should already have filtered to
   *  APPROVED only, since a pending or rejected request isn't a real
   *  "out of office" fact yet. */
  leaves: any[];
}) {
  const dayEvents: any[] = [];

  if (filters.company) {
    announcements.forEach((a: any) => {
      const aDate = new Date(a.createdAt);
      if (aDate.getFullYear() === year && aDate.getMonth() === month && aDate.getDate() === day) {
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

  if (filters.team) {
    tasks.forEach((t: any) => {
      if (t.dueDate) {
        const tDate = new Date(t.dueDate);
        if (tDate.getFullYear() === year && tDate.getMonth() === month && tDate.getDate() === day) {
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

  // Scheduled meetings plot on their scheduled date; instant "start now" meetings
  // (no scheduledFor) plot on the day they were created, since that's the only date we have.
  if (filters.meeting) {
    meetings.forEach((m: any) => {
      const mDate = new Date(m.scheduledFor || m.createdAt);
      if (mDate.getFullYear() === year && mDate.getMonth() === month && mDate.getDate() === day) {
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

  if (filters.birthday) {
    birthdays.forEach((b: any) => {
      const bDate = new Date(b.date);
      if (bDate.getMonth() === month && bDate.getDate() === day) {
        dayEvents.push({
          id: `bday-${b.id}`,
          type: 'birthday',
          title: `🎂 Birthday: ${b.firstName} ${b.lastName}`,
          description: `Wish ${b.firstName} ${b.lastName} (${b.designation || 'Teammate'}) a wonderful birthday!`,
          color: 'bg-pink-500 text-white',
          dotColor: 'bg-pink-500',
          icon: Gift,
          meta: `${b.designation || 'Teammate'}`,
        });
      }
    });
  }

  if (filters.leave) {
    const thisDay = new Date(year, month, day);
    leaves.forEach((l: any) => {
      if (l.status !== 'APPROVED') return;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      if (thisDay >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
          thisDay <= new Date(end.getFullYear(), end.getMonth(), end.getDate())) {
        dayEvents.push({
          id: `leave-${l.id}`,
          type: 'leave',
          title: `🏖️ Out of Office: ${l.user?.firstName || 'Teammate'}`,
          description: `${l.user?.firstName || ''} ${l.user?.lastName || ''} is on ${l.leaveType?.toLowerCase() || ''} leave.`,
          color: 'bg-amber-500 text-white',
          dotColor: 'bg-amber-500',
          icon: Clock,
          meta: `${l.leaveType || 'Leave'} • ${new Date(l.startDate).toLocaleDateString()} - ${new Date(l.endDate).toLocaleDateString()}`,
        });
      }
    });
  }

  return dayEvents;
}
