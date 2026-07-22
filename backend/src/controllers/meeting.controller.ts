import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createManyNotifications } from '../services/notification.service';

// Google Meet style code: xxx-yyyy-zzz, always lowercase so string comparisons
// (DB unique lookup, socket.io room names) never fail because of case.
const generateMeetingCode = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
};

const normalizeCode = (code: string) => code.trim().toLowerCase();

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
// their calendar and "My Meetings" list ahead of time.
export const scheduleMeeting = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const hostId = req.user!.id;
    const { title, scheduledFor, durationMins, inviteeIds } = req.body || {};

    if (!scheduledFor || isNaN(new Date(scheduledFor).getTime())) {
      res.status(400).json({ message: 'A valid scheduledFor date/time is required.' });
      return;
    }
    if (new Date(scheduledFor).getTime() < Date.now() - 60_000) {
      res.status(400).json({ message: 'Scheduled time must be in the future.' });
      return;
    }

    const uniqueInviteeIds: string[] = Array.isArray(inviteeIds)
      ? [...new Set(inviteeIds.filter((id: any) => typeof id === 'string' && id !== hostId))]
      : [];

    let code = generateMeetingCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const existing = await prisma.meeting.findUnique({ where: { code } });
      if (!existing) break;
      code = generateMeetingCode();
    }

    const meeting = await prisma.meeting.create({
      data: {
        code,
        title: title || null,
        hostId,
        status: 'SCHEDULED',
        scheduledFor: new Date(scheduledFor),
        durationMins: durationMins ? Math.max(1, Math.min(480, parseInt(durationMins, 10))) : null,
        invites: {
          create: uniqueInviteeIds.map((userId) => ({ userId })),
        },
      },
      include: {
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
        invites: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });

    if (uniqueInviteeIds.length > 0) {
      const io = req.app.get('io');
      const hostName = `${req.user?.firstName} ${req.user?.lastName}`.trim();
      const when = new Date(scheduledFor).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      await createManyNotifications({
        notifications: uniqueInviteeIds.map((userId) => ({
          userId,
          title: 'Meeting Invite',
          message: `${hostName} invited you to "${meeting.title || 'a meeting'}" on ${when}.`,
          type: 'MEETING',
          relatedId: meeting.id,
          emailFeature: 'MEETING_INVITE' as any,
        })),
        io,
      });
    }

    res.status(201).json(meeting);
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
  } catch (error) {
    next(error);
  }
};

// GET /api/meetings — meetings the current user hosted OR was invited to (used to
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
