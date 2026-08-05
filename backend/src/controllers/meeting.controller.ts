import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createManyNotifications } from '../services/notification.service';
import { emitDataUpdate } from '../utils/realtime';
import { buildIcsCalendar } from '../utils/ics';

// Google Meet style code: xxx-yyyy-zzz, always lowercase so string comparisons
// (DB unique lookup, socket.io room names) never fail because of case.
const generateMeetingCode = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
};

const normalizeCode = (code: string) => code.trim().toLowerCase();

const uniqueMeetingCode = async (): Promise<string> => {
  let code = generateMeetingCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const existing = await prisma.meeting.findUnique({ where: { code } });
    if (!existing) break;
    code = generateMeetingCode();
  }
  return code;
};

const VALID_RECURRENCE_RULES = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];
// Hard safety cap on how many occurrences a single "schedule" call can ever
// generate — independent of whatever recurrenceEndDate was requested — so a
// mistaken far-future end date (or a client bug) can't silently create
// hundreds of rows and hundreds of notifications in one request.
const MAX_RECURRENCE_OCCURRENCES = 52;

const nextOccurrence = (date: Date, rule: string): Date => {
  const next = new Date(date);
  switch (rule) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'WEEKLY':
    default:
      next.setDate(next.getDate() + 7);
      break;
  }
  return next;
};

// POST /api/meetings — host creates a meeting shell (status: SCHEDULED)
export const createMeeting = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const hostId = req.user!.id;
    const { title } = req.body || {};

    let code = generateMeetingCode();
    // Extremely unlikely collision, but guard anyway.
    for (let attempts = 0; attempts < 5; attempts++) {
      const existing = await prisma.meeting.findUnique({ where: { code } });
      if (!existing) break;
      code = generateMeetingCode();
    }

    const meeting = await prisma.meeting.create({
      data: { code, title: title || null, hostId, status: 'SCHEDULED' },
    });

    res.status(201).json(meeting);
  } catch (error) {
    next(error);
  }
};

// POST /api/meetings/schedule — book a meeting for later and invite teammates.
// Unlike createMeeting (instant "start now"), this sets scheduledFor/durationMins
// and creates a MeetingInvite + notification for each invitee, so it shows up on
// their calendar and "My Meetings" list ahead of time. Optionally recurring —
// see recurrenceRule handling below.
export const scheduleMeeting = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const hostId = req.user!.id;
    const { title, scheduledFor, durationMins, inviteeIds, recurrenceRule, recurrenceEndDate } = req.body || {};

    if (!scheduledFor || isNaN(new Date(scheduledFor).getTime())) {
      res.status(400).json({ message: 'A valid scheduledFor date/time is required.' });
      return;
    }
    if (new Date(scheduledFor).getTime() < Date.now() - 60_000) {
      res.status(400).json({ message: 'Scheduled time must be in the future.' });
      return;
    }

    let normalizedRecurrenceEndDate: Date | null = null;
    if (recurrenceRule) {
      if (!VALID_RECURRENCE_RULES.includes(recurrenceRule)) {
        res.status(400).json({ message: `recurrenceRule must be one of: ${VALID_RECURRENCE_RULES.join(', ')}.` });
        return;
      }
      if (!recurrenceEndDate || isNaN(new Date(recurrenceEndDate).getTime())) {
        res.status(400).json({ message: 'A recurring meeting needs a valid recurrenceEndDate (when the series stops).' });
        return;
      }
      normalizedRecurrenceEndDate = new Date(recurrenceEndDate);
      if (normalizedRecurrenceEndDate <= new Date(scheduledFor)) {
        res.status(400).json({ message: 'recurrenceEndDate must be after the first occurrence.' });
        return;
      }
    }

    const uniqueInviteeIds: string[] = Array.isArray(inviteeIds)
      ? [...new Set(inviteeIds.filter((id: any) => typeof id === 'string' && id !== hostId))]
      : [];

    // Work out every occurrence date up front (bounded by both the
    // requested end date and the hard safety cap, whichever is more
    // restrictive) so we know exactly how many rows we're about to create.
    const occurrenceDates: Date[] = [new Date(scheduledFor)];
    if (recurrenceRule && normalizedRecurrenceEndDate) {
      let cursor = new Date(scheduledFor);
      while (occurrenceDates.length < MAX_RECURRENCE_OCCURRENCES) {
        cursor = nextOccurrence(cursor, recurrenceRule);
        if (cursor > normalizedRecurrenceEndDate) break;
        occurrenceDates.push(new Date(cursor));
      }
    }

    const durationMinsClamped = durationMins ? Math.max(1, Math.min(480, parseInt(durationMins, 10))) : null;
    const recurrenceGroupId = recurrenceRule ? crypto.randomUUID() : null;

    const createdMeetings = [];
    for (const occurrenceDate of occurrenceDates) {
      const code = await uniqueMeetingCode();
      const meeting = await prisma.meeting.create({
        data: {
          code,
          title: title || null,
          hostId,
          status: 'SCHEDULED',
          scheduledFor: occurrenceDate,
          durationMins: durationMinsClamped,
          recurrenceRule: recurrenceRule || null,
          recurrenceGroupId,
          recurrenceEndDate: normalizedRecurrenceEndDate,
          invites: {
            create: uniqueInviteeIds.map((userId) => ({ userId })),
          },
        },
        include: {
          host: { select: { id: true, firstName: true, lastName: true, email: true } },
          invites: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        },
      });
      createdMeetings.push(meeting);
    }

    const firstMeeting = createdMeetings[0];

    if (uniqueInviteeIds.length > 0) {
      const io = req.app.get('io');
      const hostName = `${req.user?.firstName} ${req.user?.lastName}`.trim();
      const when = new Date(scheduledFor).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      // One notification for the whole series, not one per occurrence —
      // getting 12 near-identical "invited you to a meeting" pings for a
      // single weekly-standup booking would be exactly the notification
      // fatigue the Notification Preferences feature exists to prevent.
      const recurrenceNote = createdMeetings.length > 1
        ? ` (repeats ${recurrenceRule!.toLowerCase()}, ${createdMeetings.length} occurrences)`
        : '';
      await createManyNotifications({
        notifications: uniqueInviteeIds.map((userId) => ({
          userId,
          title: 'Meeting Invite',
          message: `${hostName} invited you to "${firstMeeting.title || 'a meeting'}" on ${when}${recurrenceNote}.`,
          type: 'MEETING',
          relatedId: firstMeeting.id,
          emailFeature: 'MEETING_INVITE' as any,
        })),
        io,
      });
    }

    res.status(201).json({ ...firstMeeting, occurrencesCreated: createdMeetings.length });

    emitDataUpdate(req, 'meetings');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/meetings/:id/invite — an invitee accepts or declines a scheduled meeting
export const respondToInvite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (status !== 'ACCEPTED' && status !== 'DECLINED') {
      res.status(400).json({ message: "Status must be 'ACCEPTED' or 'DECLINED'." });
      return;
    }

    const invite = await prisma.meetingInvite.findUnique({
      where: { meetingId_userId: { meetingId: id, userId: req.user!.id } },
    });

    if (!invite) {
      res.status(404).json({ message: 'You were not invited to this meeting.' });
      return;
    }

    const updated = await prisma.meetingInvite.update({
      where: { id: invite.id },
      data: { status },
    });

    res.json(updated);

    emitDataUpdate(req, 'meetings');
  } catch (error) {
    next(error);
  }
};

// GET /api/meetings/:code — anyone authenticated can look up a code to check
// it's real and see whether it's live yet, BEFORE committing to the waiting
// screen. This is what turns "typo in the code -> spins forever" into an
// immediate, honest error.
export const getMeetingByCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const code = normalizeCode(req.params.code);
    const meeting = await prisma.meeting.findUnique({
      where: { code },
      include: { host: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!meeting || meeting.status === 'ENDED') {
      return res.status(404).json({ message: 'No active meeting found for this code.' });
    }

    res.json({
      code: meeting.code,
      title: meeting.title,
      status: meeting.status,
      hostId: meeting.hostId,
      hostName: `${meeting.host.firstName} ${meeting.host.lastName}`.trim(),
      scheduledFor: meeting.scheduledFor,
      durationMins: meeting.durationMins,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/meetings/:code/start — only the host can flip it live
export const startMeeting = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const code = normalizeCode(req.params.code);
    const meeting = await prisma.meeting.findUnique({ where: { code } });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found.' });
    }
    if (meeting.hostId !== req.user!.id) {
      return res.status(403).json({ message: 'Only the host can start this meeting.' });
    }

    const updated = await prisma.meeting.update({
      where: { code },
      data: { status: 'LIVE', startedAt: meeting.startedAt || new Date() },
    });

    res.json(updated);

    emitDataUpdate(req, 'meetings');
  } catch (error) {
    next(error);
  }
};

// POST /api/meetings/:code/end — only the host can close it out
export const endMeeting = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const code = normalizeCode(req.params.code);
    const meeting = await prisma.meeting.findUnique({ where: { code } });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found.' });
    }
    if (meeting.hostId !== req.user!.id) {
      return res.status(403).json({ message: 'Only the host can end this meeting.' });
    }

    const updated = await prisma.meeting.update({
      where: { code },
      data: { status: 'ENDED', endedAt: new Date() },
    });

    res.json(updated);

    emitDataUpdate(req, 'meetings');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/meetings/:id?scope=series|occurrence — only the host can cancel.
// scope=occurrence (default) cancels just this one meeting. scope=series
// cancels this occurrence and every future one sharing its
// recurrenceGroupId — past/already-ended occurrences in the series are left
// alone, since "cancel the series" means "stop it going forward", not
// "erase what already happened".
export const cancelMeeting = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const scope = req.query.scope === 'series' ? 'series' : 'occurrence';

    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      res.status(404).json({ message: 'Meeting not found.' });
      return;
    }
    if (meeting.hostId !== req.user!.id) {
      res.status(403).json({ message: 'Only the host can cancel this meeting.' });
      return;
    }
    if (meeting.status === 'LIVE') {
      res.status(400).json({ message: 'This meeting is currently live — end it instead of cancelling it.' });
      return;
    }

    let cancelledCount = 1;
    if (scope === 'series' && meeting.recurrenceGroupId) {
      const result = await prisma.meeting.updateMany({
        where: {
          recurrenceGroupId: meeting.recurrenceGroupId,
          status: 'SCHEDULED',
          scheduledFor: { gte: meeting.scheduledFor || new Date() },
        },
        data: { status: 'CANCELLED' },
      });
      cancelledCount = result.count;
    } else {
      await prisma.meeting.update({ where: { id }, data: { status: 'CANCELLED' } });
    }

    res.json({ message: scope === 'series' ? 'Meeting series cancelled.' : 'Meeting cancelled.', cancelledCount });

    emitDataUpdate(req, 'meetings');
  } catch (error) {
    next(error);
  }
};
// plot "my meetings" on the calendar and the "My Meetings" scheduler panel). Scoped
// to the requester: meeting codes double as join credentials, so listing every
// meeting company-wide would hand out other people's join codes.
export const getMeetings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [
          { hostId: userId },
          { invites: { some: { userId } } },
        ],
      },
      include: {
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
        invites: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
      },
      orderBy: [{ scheduledFor: 'desc' }, { createdAt: 'desc' }],
    });

    const shaped = meetings.map((m) => ({
      ...m,
      isHost: m.hostId === userId,
      myInviteStatus: m.hostId === userId ? null : (m.invites.find((i) => i.userId === userId)?.status ?? null),
    }));

    res.json(shaped);
  } catch (error) {
    next(error);
  }
};

// GET /api/meetings/:id/ics — download a single meeting as a .ics file that
// any calendar app (Google Calendar, Outlook, Apple Calendar) can import.
// Only the host or an invitee can download it — same visibility rule as
// getMeetings, since the file embeds the meeting's join link.
export const getMeetingIcs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: { host: { select: { firstName: true, lastName: true, email: true } }, invites: { select: { userId: true } } },
    });
    if (!meeting) {
      res.status(404).json({ message: 'Meeting not found.' });
      return;
    }
    const isParticipant = meeting.hostId === userId || meeting.invites.some((i) => i.userId === userId);
    if (!isParticipant) {
      res.status(403).json({ message: 'You are not part of this meeting.' });
      return;
    }
    if (!meeting.scheduledFor) {
      res.status(400).json({ message: 'This meeting has no scheduled time to export.' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const ics = buildIcsCalendar([{
      uid: `meeting-${meeting.id}@connecthub`,
      title: meeting.title || 'Meeting',
      start: meeting.scheduledFor,
      durationMins: meeting.durationMins,
      organizerEmail: meeting.host.email,
      organizerName: `${meeting.host.firstName} ${meeting.host.lastName}`.trim(),
      url: `${frontendUrl}/meetings?code=${meeting.code}`,
      cancelled: meeting.status === 'CANCELLED',
    }]);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${meeting.code}.ics"`);
    res.send(ics);
  } catch (error) {
    next(error);
  }
};

// POST /api/meetings/calendar-feed/token — (re)generate the caller's
// personal calendar subscription token, and return the full subscribe URL.
// Regenerating invalidates whatever URL a calendar app already has cached,
// which is the intended way to revoke access if the URL ever leaks.
export const regenerateCalendarFeedToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = crypto.randomBytes(24).toString('hex');
    await prisma.user.update({ where: { id: req.user!.id }, data: { calendarFeedToken: token } });

    const backendUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      feedUrl: `${backendUrl}/api/v1/meetings/calendar-feed/${token}.ics`,
      // webcal:// is what actually triggers "Add this subscription?" in
      // most calendar apps when the link is clicked, rather than just
      // downloading a one-off file the way a bare https:// URL would.
      webcalUrl: `webcal://${req.get('host')}/api/v1/meetings/calendar-feed/${token}.ics`,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/meetings/calendar-feed/:token.ics — deliberately NOT behind
// `authenticate`. Calendar apps poll a subscription URL on their own
// schedule with a plain unauthenticated GET; they can't attach a JWT. The
// token in the URL path is the credential instead — see calendarFeedToken's
// doc comment on the User model.
export const getCalendarFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req.params.token || '').replace(/\.ics$/i, '');
    if (!token) {
      res.status(404).send('Not found.');
      return;
    }

    const user = await prisma.user.findUnique({ where: { calendarFeedToken: token } });
    if (!user) {
      res.status(404).send('Not found.');
      return;
    }

    // Only ever pull FUTURE meetings the person is actually part of — a
    // subscription feed is meant to be a live, rolling view of what's
    // coming up, not a growing archive of everything that's ever happened.
    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [{ hostId: user.id }, { invites: { some: { userId: user.id } } }],
        scheduledFor: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // small lookback so "today's" meetings don't vanish mid-day
        status: { in: ['SCHEDULED', 'LIVE', 'CANCELLED'] },
      },
      include: { host: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { scheduledFor: 'asc' },
      take: 500,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const ics = buildIcsCalendar(
      meetings
        .filter((m) => m.scheduledFor)
        .map((m) => ({
          uid: `meeting-${m.id}@connecthub`,
          title: m.title || 'Meeting',
          start: m.scheduledFor!,
          durationMins: m.durationMins,
          organizerEmail: m.host.email,
          organizerName: `${m.host.firstName} ${m.host.lastName}`.trim(),
          url: `${frontendUrl}/meetings?code=${m.code}`,
          cancelled: m.status === 'CANCELLED',
        })),
      'ConnectHub Meetings'
    );

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(ics);
  } catch (error) {
    next(error);
  }
};
