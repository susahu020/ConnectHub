import {
  parseHHMMToMinutes,
  determineClockInStatus,
  computeBreakMinutes,
  computeWorkedMinutes,
  determineFinalAttendanceStatus,
} from '../attendanceStatus.service';

describe('parseHHMMToMinutes', () => {
  it('parses a valid HH:MM into minutes since midnight', () => {
    expect(parseHHMMToMinutes('09:00')).toBe(540);
    expect(parseHHMMToMinutes('00:00')).toBe(0);
    expect(parseHHMMToMinutes('23:59')).toBe(1439);
  });

  it('returns null for missing, empty, or malformed input', () => {
    expect(parseHHMMToMinutes(null)).toBeNull();
    expect(parseHHMMToMinutes(undefined)).toBeNull();
    expect(parseHHMMToMinutes('')).toBeNull();
    expect(parseHHMMToMinutes('not-a-time')).toBeNull();
    expect(parseHHMMToMinutes('25:00')).toBeNull();
    expect(parseHHMMToMinutes('09:60')).toBeNull();
  });
});

describe('determineClockInStatus', () => {
  it('marks PRESENT for arrival exactly at the expected start time', () => {
    const clockIn = new Date(2026, 0, 5, 9, 0);
    expect(determineClockInStatus(clockIn, '09:00', 15)).toBe('PRESENT');
  });

  it('marks PRESENT when arrival is within the grace period', () => {
    const clockIn = new Date(2026, 0, 5, 9, 10);
    expect(determineClockInStatus(clockIn, '09:00', 15)).toBe('PRESENT');
  });

  it('marks LATE when arrival is past the grace period', () => {
    const clockIn = new Date(2026, 0, 5, 9, 20);
    expect(determineClockInStatus(clockIn, '09:00', 15)).toBe('LATE');
  });

  it('marks PRESENT for early arrival', () => {
    const clockIn = new Date(2026, 0, 5, 8, 30);
    expect(determineClockInStatus(clockIn, '09:00', 15)).toBe('PRESENT');
  });

  it('treats a negative grace period as zero rather than making the window stricter than "on time"', () => {
    const clockIn = new Date(2026, 0, 5, 9, 0);
    expect(determineClockInStatus(clockIn, '09:00', -5)).toBe('PRESENT');
  });

  it('defaults to PRESENT when the expected start time is unset or malformed, rather than guessing', () => {
    const clockIn = new Date(2026, 0, 5, 14, 0);
    expect(determineClockInStatus(clockIn, null, 15)).toBe('PRESENT');
    expect(determineClockInStatus(clockIn, 'garbage', 15)).toBe('PRESENT');
  });
});

describe('computeBreakMinutes', () => {
  it('sums multiple closed breaks', () => {
    const breaks = [
      { startTime: new Date(2026, 0, 5, 12, 0), endTime: new Date(2026, 0, 5, 12, 30) },
      { startTime: new Date(2026, 0, 5, 15, 0), endTime: new Date(2026, 0, 5, 15, 15) },
    ];
    expect(computeBreakMinutes(breaks)).toBe(45);
  });

  it('ignores a break that was never closed out', () => {
    const breaks = [
      { startTime: new Date(2026, 0, 5, 12, 0), endTime: new Date(2026, 0, 5, 12, 30) },
      { startTime: new Date(2026, 0, 5, 15, 0), endTime: null },
    ];
    expect(computeBreakMinutes(breaks)).toBe(30);
  });

  it('returns 0 for no breaks', () => {
    expect(computeBreakMinutes([])).toBe(0);
  });
});

describe('computeWorkedMinutes', () => {
  it('computes gross time minus break time', () => {
    const clockIn = new Date(2026, 0, 5, 9, 0);
    const clockOut = new Date(2026, 0, 5, 17, 0); // 8 hours gross
    const breaks = [{ startTime: new Date(2026, 0, 5, 12, 0), endTime: new Date(2026, 0, 5, 12, 30) }]; // 30 min
    expect(computeWorkedMinutes(clockIn, clockOut, breaks)).toBe(450); // 7.5 hours
  });

  it('never goes negative even with bad data', () => {
    const clockIn = new Date(2026, 0, 5, 17, 0);
    const clockOut = new Date(2026, 0, 5, 9, 0); // clockOut before clockIn
    expect(computeWorkedMinutes(clockIn, clockOut, [])).toBe(0);
  });
});

describe('determineFinalAttendanceStatus', () => {
  it('downgrades a punctual PRESENT day to HALF_DAY when worked hours are below threshold', () => {
    expect(determineFinalAttendanceStatus('PRESENT', 180, 4)).toBe('HALF_DAY'); // 3h worked, 4h threshold
  });

  it('downgrades a LATE day to HALF_DAY too, when worked hours are below threshold', () => {
    expect(determineFinalAttendanceStatus('LATE', 100, 4)).toBe('HALF_DAY');
  });

  it('keeps PRESENT when worked hours meet the threshold', () => {
    expect(determineFinalAttendanceStatus('PRESENT', 240, 4)).toBe('PRESENT');
  });

  it('preserves LATE (does not "reward" lateness back to PRESENT) when hours meet the threshold', () => {
    expect(determineFinalAttendanceStatus('LATE', 480, 4)).toBe('LATE');
  });

  it('treats worked minutes exactly at the threshold as meeting it, not below it', () => {
    expect(determineFinalAttendanceStatus('PRESENT', 240, 4)).toBe('PRESENT'); // exactly 4h
  });
});
