import { Compass, Trello, Video, Gift, Clock } from 'lucide-react';

// Deterministic pseudo-random birthday derived from userId (no real birthday data in this demo dataset)
export function getColleagueBirthday(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const month = Math.abs(hash % 12);
  const day = Math.abs((hash >> 3) % 28) + 1;
  return { month, day };
}

// Deterministic pseudo-random leave window derived from userId, only surfaced when status is ON_LEAVE
export function getColleagueLeave(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const startDay = Math.abs(hash % 20) + 1;
  const duration = Math.abs((hash >> 2) % 6) + 3; // 3 to 8 days
  return { startDay, endDay: startDay + duration };
}

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
  colleagues,
}: {
  year: number;
  month: number;
  day: number;
  filters: CalendarFilters;
  announcements: any[];
  tasks: any[];
  meetings: any[];
  colleagues: any[];
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
}
