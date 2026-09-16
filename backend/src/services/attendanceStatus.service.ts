// ==========================================
// ATTENDANCE STATUS AUTOMATION
// ==========================================
// Previously clockIn hardcoded `status: 'PRESENT'` no matter when someone
// actually showed up, and nothing ever downgraded a day to HALF_DAY based
// on hours actually worked. These pure helpers replace that with real
// Late/Half-Day detection so downstream payroll proration has accurate
// data to work with. Kept side-effect-free and DB-free on purpose so the
// logic is directly unit-testable — see hr.controller.ts for the thin
// DB-fetching wrappers (shift lookup, org defaults) that feed these.

export type BasicAttendanceStatus = 'PRESENT' | 'LATE';
export type FinalAttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY';

/** Parses "HH:MM" (24h) into minutes since midnight. Returns null if malformed. */
export const parseHHMMToMinutes = (hhmm: string | null | undefined): number | null => {
  if (!hhmm) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

/**
 * Compares an actual clock-in timestamp against the expected shift start
 * (in the clock-in's own local time-of-day) plus a grace period. Falls
 * back to PRESENT if the expected start time can't be parsed, rather than
 * ever guessing someone is late off of bad configuration data.
 */
export const determineClockInStatus = (
  clockInAt: Date,
  expectedStartHHMM: string | null | undefined,
  graceMinutes: number
): BasicAttendanceStatus => {
  const expectedStartMinutes = parseHHMMToMinutes(expectedStartHHMM);
  if (expectedStartMinutes === null) return 'PRESENT';

  const actualMinutes = clockInAt.getHours() * 60 + clockInAt.getMinutes();
  const graceDeadline = expectedStartMinutes + Math.max(0, graceMinutes);

  return actualMinutes > graceDeadline ? 'LATE' : 'PRESENT';
};

/** Sums break durations in minutes, ignoring any break still open (no endTime). */
export const computeBreakMinutes = (breaks: Array<{ startTime: Date; endTime: Date | null }>): number => {
  return breaks.reduce((total, b) => {
    if (!b.endTime) return total;
    const durationMs = b.endTime.getTime() - b.startTime.getTime();
    return total + Math.max(0, durationMs / 60000);
  }, 0);
};

/** Net worked minutes between clock-in and clock-out, minus break time. Never negative. */
export const computeWorkedMinutes = (
  clockIn: Date,
  clockOut: Date,
  breaks: Array<{ startTime: Date; endTime: Date | null }>
): number => {
  const grossMinutes = (clockOut.getTime() - clockIn.getTime()) / 60000;
  const breakMinutes = computeBreakMinutes(breaks);
  return Math.max(0, grossMinutes - breakMinutes);
};

/**
 * Final status for a completed (clocked-out) day. HALF_DAY takes priority
 * over whatever was recorded at clock-in — someone who arrived on time but
 * left after 3 hours worked a half day regardless of punctuality; someone
 * who arrived late but stayed a full shift keeps LATE, since the lateness
 * itself is still worth flagging separately from hours worked.
 */
export const determineFinalAttendanceStatus = (
  entryStatus: BasicAttendanceStatus,
  workedMinutes: number,
  halfDayThresholdHours: number
): FinalAttendanceStatus => {
  const thresholdMinutes = Math.max(0, halfDayThresholdHours) * 60;
  if (workedMinutes < thresholdMinutes) return 'HALF_DAY';
  return entryStatus;
};
