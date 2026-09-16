// ==========================================
// ATTENDANCE ANOMALY DETECTION
// ==========================================
// payroll.service.ts already turns a month's attendance/leave records into
// a breakdown (absentDays, lateDays, halfDays, unpaidLeaveDays, ...). This
// module adds a second, independent pass over that same breakdown: flag
// patterns worth a human's attention *before* the payslip gets generated,
// rather than an Admin only noticing "huh, 9 absences" while staring at a
// finished payslip.
//
// Unlike statutoryDeductions.service.ts, nothing here changes any money —
// it only produces human-readable flags — so it's safe to ship enabled by
// default with reasonable thresholds. An org can still tune or disable it
// via OrganizationSettings.attendanceAnomalyPolicy.

export interface AttendanceAnomalyPolicy {
  enabled: boolean;
  /** More than this many fully-absent days in the month triggers a flag. */
  maxAbsentDays: number;
  /** More than this many late arrivals in the month triggers a flag. */
  maxLateDays: number;
  /** More than this many half-days in the month triggers a flag. */
  maxHalfDays: number;
  /** More than this many unpaid-leave days in the month triggers a flag. */
  maxUnpaidLeaveDays: number;
}

export const DEFAULT_ATTENDANCE_ANOMALY_POLICY: AttendanceAnomalyPolicy = {
  enabled: true,
  maxAbsentDays: 3,
  maxLateDays: 5,
  maxHalfDays: 3,
  maxUnpaidLeaveDays: 3,
};

export type AttendanceAnomalyType =
  | 'EXCESSIVE_ABSENCES'
  | 'EXCESSIVE_LATENESS'
  | 'EXCESSIVE_HALF_DAYS'
  | 'EXCESSIVE_UNPAID_LEAVE';

export interface AttendanceAnomalyFlag {
  type: AttendanceAnomalyType;
  count: number;
  threshold: number;
  message: string;
}

export interface AttendanceAnomalyInput {
  absentDays: number;
  lateDays: number;
  halfDays: number;
  unpaidLeaveDays: number;
}

/** Pure/DB-free — see hr.controller.ts for where this is called against a real month's PayrollBreakdown. */
export const detectAttendanceAnomalies = (
  input: AttendanceAnomalyInput,
  policy: AttendanceAnomalyPolicy = DEFAULT_ATTENDANCE_ANOMALY_POLICY
): AttendanceAnomalyFlag[] => {
  if (!policy.enabled) return [];

  const flags: AttendanceAnomalyFlag[] = [];

  if (input.absentDays > policy.maxAbsentDays) {
    flags.push({
      type: 'EXCESSIVE_ABSENCES',
      count: input.absentDays,
      threshold: policy.maxAbsentDays,
      message: `${input.absentDays} unexplained absences this month (threshold: ${policy.maxAbsentDays}).`,
    });
  }

  if (input.lateDays > policy.maxLateDays) {
    flags.push({
      type: 'EXCESSIVE_LATENESS',
      count: input.lateDays,
      threshold: policy.maxLateDays,
      message: `${input.lateDays} late arrivals this month (threshold: ${policy.maxLateDays}).`,
    });
  }

  if (input.halfDays > policy.maxHalfDays) {
    flags.push({
      type: 'EXCESSIVE_HALF_DAYS',
      count: input.halfDays,
      threshold: policy.maxHalfDays,
      message: `${input.halfDays} half-days this month (threshold: ${policy.maxHalfDays}).`,
    });
  }

  if (input.unpaidLeaveDays > policy.maxUnpaidLeaveDays) {
    flags.push({
      type: 'EXCESSIVE_UNPAID_LEAVE',
      count: input.unpaidLeaveDays,
      threshold: policy.maxUnpaidLeaveDays,
      message: `${input.unpaidLeaveDays} unpaid leave days this month (threshold: ${policy.maxUnpaidLeaveDays}).`,
    });
  }

  return flags;
};

// ==========================================
// POLICY VALIDATION
// ==========================================
// Same purpose as statutoryDeductions.service.ts's validator — used by
// organization.controller.ts before writing an admin-submitted policy to
// OrganizationSettings.attendanceAnomalyPolicy.

const isNonNegativeInt = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v >= 0;

export const validateAttendanceAnomalyPolicy = (
  input: any
): { valid: true; policy: AttendanceAnomalyPolicy } | { valid: false; error: string } => {
  if (typeof input !== 'object' || input === null) {
    return { valid: false, error: 'attendanceAnomalyPolicy must be an object.' };
  }
  if (typeof input.enabled !== 'boolean') {
    return { valid: false, error: 'attendanceAnomalyPolicy.enabled must be a boolean.' };
  }
  for (const field of ['maxAbsentDays', 'maxLateDays', 'maxHalfDays', 'maxUnpaidLeaveDays'] as const) {
    if (!isNonNegativeInt(input[field])) {
      return { valid: false, error: `attendanceAnomalyPolicy.${field} must be a whole number >= 0.` };
    }
  }
  return {
    valid: true,
    policy: {
      enabled: input.enabled,
      maxAbsentDays: input.maxAbsentDays,
      maxLateDays: input.maxLateDays,
      maxHalfDays: input.maxHalfDays,
      maxUnpaidLeaveDays: input.maxUnpaidLeaveDays,
    },
  };
};
