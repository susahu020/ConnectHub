// ==========================================
// OVERTIME TRACKING
// ==========================================
// Nothing in the payroll engine previously accounted for hours worked
// beyond a normal day — an employee who regularly stayed late got the
// exact same payslip as someone who worked exactly their shift. This adds
// a daily-threshold-based overtime calculation, additive to (not modifying)
// payroll.service.ts's core proration — same reasoning as
// statutoryDeductions.service.ts and attendanceAnomaly.service.ts being
// separate modules merged into the breakdown response rather than changes
// to computePayrollBreakdown's own signature/logic.
//
// Disabled by default (like statutory deductions, and unlike the anomaly
// detector) — overtime pay is real money and org-specific policy
// (threshold, multiplier), so it must be explicitly configured and turned
// on rather than silently applying assumptions.

export interface OvertimePolicy {
  enabled: boolean;
  /** Hours worked beyond this in a single day count as overtime for that day. */
  dailyThresholdHours: number;
  /** Overtime hours are paid at this multiple of the regular hourly rate (e.g. 1.5 for "time and a half"). */
  rateMultiplier: number;
}

export const DEFAULT_OVERTIME_POLICY: OvertimePolicy = {
  enabled: false,
  dailyThresholdHours: 8,
  rateMultiplier: 1.5,
};

export interface DailyWorkedMinutes {
  date: Date;
  workedMinutes: number;
}

export interface OvertimeInput {
  dailyRecords: DailyWorkedMinutes[];
  /** The month's (prorated or full) basic salary — used to derive an hourly rate. */
  basicSalary: number;
  /** Working days in the month, for the same per-day-rate math payroll.service.ts already uses. */
  workingDaysInMonth: number;
  policy: OvertimePolicy;
}

export interface OvertimeBreakdown {
  totalOvertimeHours: number;
  /** The hourly rate overtime was calculated against — surfaced for transparency, not just the final number. */
  hourlyRate: number;
  totalOvertimePay: number;
  appliedRule: boolean;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Pure/DB-free — see hr.controller.ts for where daily worked-minutes are actually fetched and computed. */
export const computeOvertime = (input: OvertimeInput): OvertimeBreakdown => {
  const { dailyRecords, basicSalary, workingDaysInMonth, policy } = input;

  if (!policy.enabled || workingDaysInMonth <= 0 || policy.dailyThresholdHours <= 0) {
    return { totalOvertimeHours: 0, hourlyRate: 0, totalOvertimePay: 0, appliedRule: false };
  }

  const thresholdMinutes = policy.dailyThresholdHours * 60;
  const totalOvertimeMinutes = dailyRecords.reduce(
    (sum, record) => sum + Math.max(0, record.workedMinutes - thresholdMinutes),
    0
  );
  const totalOvertimeHours = round2(totalOvertimeMinutes / 60);

  const perDayRate = basicSalary / workingDaysInMonth;
  const hourlyRate = round2(perDayRate / policy.dailyThresholdHours);
  const totalOvertimePay = round2(totalOvertimeHours * hourlyRate * policy.rateMultiplier);

  return { totalOvertimeHours, hourlyRate, totalOvertimePay, appliedRule: true };
};

// ==========================================
// POLICY VALIDATION
// ==========================================
// Same purpose/pattern as the other policy validators (statutoryDeductions,
// attendanceAnomaly, geofence) — used by organization.controller.ts before
// writing an admin-submitted policy to OrganizationSettings.overtimePolicy.
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const validateOvertimePolicy = (
  input: any
): { valid: true; policy: OvertimePolicy } | { valid: false; error: string } => {
  if (typeof input !== 'object' || input === null) {
    return { valid: false, error: 'overtimePolicy must be an object.' };
  }
  if (typeof input.enabled !== 'boolean') {
    return { valid: false, error: 'overtimePolicy.enabled must be a boolean.' };
  }
  if (!isFiniteNumber(input.dailyThresholdHours) || input.dailyThresholdHours <= 0 || input.dailyThresholdHours > 24) {
    return { valid: false, error: 'overtimePolicy.dailyThresholdHours must be a number between 0 and 24.' };
  }
  if (!isFiniteNumber(input.rateMultiplier) || input.rateMultiplier < 1 || input.rateMultiplier > 10) {
    return { valid: false, error: 'overtimePolicy.rateMultiplier must be a number between 1 and 10.' };
  }
  return {
    valid: true,
    policy: { enabled: input.enabled, dailyThresholdHours: input.dailyThresholdHours, rateMultiplier: input.rateMultiplier },
  };
};
