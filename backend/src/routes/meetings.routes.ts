import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createMeeting,
  scheduleMeeting,
  respondToInvite,
  getMeetingByCode,
  startMeeting,
  endMeeting,
  cancelMeeting,
  getMeetingIcs,
  regenerateCalendarFeedToken,
  getCalendarFeed,
  getMeetings,
  updateCoHosts,
} from '../controllers/meeting.controller';

const router = Router();

// ==========================================
// MEETINGS (persisted source of truth backing the live socket signaling)
// ==========================================
router.get('/meetings', authenticate as any, getMeetings as any);
router.post('/meetings', authenticate as any, createMeeting as any);
router.post('/meetings/schedule', authenticate as any, scheduleMeeting as any);
router.patch('/meetings/:id/invite', authenticate as any, respondToInvite as any);
router.get('/meetings/:code', authenticate as any, getMeetingByCode as any);
router.patch('/meetings/:code/co-hosts', authenticate as any, updateCoHosts as any);
router.post('/meetings/:code/start', authenticate as any, startMeeting as any);
router.post('/meetings/:code/end', authenticate as any, endMeeting as any);
router.delete('/meetings/:id', authenticate as any, cancelMeeting as any);
router.get('/meetings/:id/ics', authenticate as any, getMeetingIcs as any);
router.post('/meetings/calendar-feed/token', authenticate as any, regenerateCalendarFeedToken as any);
// No `authenticate` here on purpose — calendar apps poll this URL with a
// plain unauthenticated GET on their own schedule; the token in the path is
// the credential instead (see getCalendarFeed's doc comment).
router.get('/meetings/calendar-feed/:token', getCalendarFeed as any);

export default router;
