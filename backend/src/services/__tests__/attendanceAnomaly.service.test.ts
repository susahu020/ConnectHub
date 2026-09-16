import {
  detectAttendanceAnomalies,
  DEFAULT_ATTENDANCE_ANOMALY_POLICY,
  AttendanceAnomalyPolicy,
} from '../attendanceAnomaly.service';

describe('detectAttendanceAnomalies', () => {
  it('returns no flags for an unremarkable month under every threshold', () => {
    const flags = detectAttendanceAnomalies({ absentDays: 1, lateDays: 2, halfDays: 0, unpaidLeaveDays: 0 });
    expect(flags).toEqual([]);
  });

  it('returns nothing at all when the policy is disabled, regardless of counts', () => {
    const policy: AttendanceAnomalyPolicy = { ...DEFAULT_ATTENDANCE_ANOMALY_POLICY, enabled: false };
    const flags = detectAttendanceAnomalies({ absentDays: 20, lateDays: 20, halfDays: 20, unpaidLeaveDays: 20 }, policy);
    expect(flags).toEqual([]);
  });

  it('flags excessive absences once the count exceeds the threshold (not at it)', () => {
    const policy: AttendanceAnomalyPolicy = { ...DEFAULT_ATTENDANCE_ANOMALY_POLICY, maxAbsentDays: 3 };
    expect(detectAttendanceAnomalies({ absentDays: 3, lateDays: 0, halfDays: 0, unpaidLeaveDays: 0 }, policy)).toEqual([]);
    const flags = detectAttendanceAnomalies({ absentDays: 4, lateDays: 0, halfDays: 0, unpaidLeaveDays: 0 }, policy);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ type: 'EXCESSIVE_ABSENCES', count: 4, threshold: 3 });
  });

  it('flags excessive lateness', () => {
    const policy: AttendanceAnomalyPolicy = { ...DEFAULT_ATTENDANCE_ANOMALY_POLICY, maxLateDays: 5 };
    const flags = detectAttendanceAnomalies({ absentDays: 0, lateDays: 6, halfDays: 0, unpaidLeaveDays: 0 }, policy);
    expect(flags).toEqual([expect.objectContaining({ type: 'EXCESSIVE_LATENESS', count: 6, threshold: 5 })]);
  });

  it('flags excessive half-days', () => {
    const policy: AttendanceAnomalyPolicy = { ...DEFAULT_ATTENDANCE_ANOMALY_POLICY, maxHalfDays: 3 };
    const flags = detectAttendanceAnomalies({ absentDays: 0, lateDays: 0, halfDays: 4, unpaidLeaveDays: 0 }, policy);
    expect(flags).toEqual([expect.objectContaining({ type: 'EXCESSIVE_HALF_DAYS', count: 4, threshold: 3 })]);
  });

  it('flags excessive unpaid leave', () => {
    const policy: AttendanceAnomalyPolicy = { ...DEFAULT_ATTENDANCE_ANOMALY_POLICY, maxUnpaidLeaveDays: 3 };
    const flags = detectAttendanceAnomalies({ absentDays: 0, lateDays: 0, halfDays: 0, unpaidLeaveDays: 4 }, policy);
    expect(flags).toEqual([expect.objectContaining({ type: 'EXCESSIVE_UNPAID_LEAVE', count: 4, threshold: 3 })]);
  });

  it('returns multiple flags together when several thresholds are breached', () => {
    const policy: AttendanceAnomalyPolicy = {
      enabled: true,
      maxAbsentDays: 3,
      maxLateDays: 5,
      maxHalfDays: 3,
      maxUnpaidLeaveDays: 3,
    };
    const flags = detectAttendanceAnomalies({ absentDays: 5, lateDays: 6, halfDays: 4, unpaidLeaveDays: 4 }, policy);
    expect(flags.map((f) => f.type).sort()).toEqual([
      'EXCESSIVE_ABSENCES',
      'EXCESSIVE_HALF_DAYS',
      'EXCESSIVE_LATENESS',
      'EXCESSIVE_UNPAID_LEAVE',
    ].sort());
  });

  it('uses the default policy when none is passed', () => {
    const flags = detectAttendanceAnomalies({ absentDays: 10, lateDays: 0, halfDays: 0, unpaidLeaveDays: 0 });
    expect(flags).toEqual([expect.objectContaining({ type: 'EXCESSIVE_ABSENCES', threshold: DEFAULT_ATTENDANCE_ANOMALY_POLICY.maxAbsentDays })]);
  });
});
