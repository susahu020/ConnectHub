import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

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

// GET /api/meetings — list all meetings
export const getMeetings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const meetings = await prisma.meeting.findMany({
      include: {
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(meetings);
  } catch (error) {
    next(error);
  }
};
