// ==========================================
// PAYROLL AUTOMATION ENGINE
// ==========================================
// generatePayslip used to be pure data entry: an Admin typed basicSalary/
// allowances/deductions from memory, with zero connection to Attendance
// or LeaveRequest. This engine computes a suggested, attendance-and-leave
// aware breakdown instead. It is intentionally advisory, not authoritative
// — the Admin still confirms (or overrides) the final numbers when
// generating a payslip; the breakdown is stored alongside the payslip
// purely as an audit trail of what the system calculated at the time.
//
// Kept pure/DB-free so the day-counting and proration math is directly
// unit-testable. See hr.controller.ts for the DB-fetching wrapper
// (`getPayrollBreakdownForEmployee`) that gathers the raw records and
// calls into this module.

export interface AttendanceRecordLite {
  /** Normalized local date (00:00:00) this record is for. */
  date: Date;
  status: string; // AttendanceStatus enum value, as a string
}

export interface ApprovedLeaveLite {
  startDate: Date;
  endDate: Date;
  /** e.g. ANNUAL, SICK, CASUAL, UNPAID — only UNPAID reduces pay. */
  leaveType: string;
  /** When true, contributes 0.5 instead of 1 to paidLeaveDays/unpaidLeaveDays for its (single) day. */
  isHalfDay?: boolean;
}

export interface HolidayLite {
  date: Date;
}

export interface PayrollCalculationInput {
  month: number; // 1-12
  year: number;
  baseSalary: number;
  attendanceRecords: AttendanceRecordLite[];
  approvedLeaves: ApprovedLeaveLite[];
  holidays: HolidayLite[];
  /** Day-of-week numbers (0=Sunday..6=Saturday) treated as non-working. */
  weeklyOffDays?: number[];
}

export interface PayrollBreakdown {
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  /** Working days with no attendance record and no leave covering them. */
  absentDays: number;
  /** Working days actually payable after unpaid leave/absence/half-day proration. */
  payableDays: number;
  baseSalary: number;
  perDayRate: number;
  /** Suggested basic salary after proration. Rounded to 2 decimals. */
  suggestedBasicSalary: number;
  /** baseSalary - suggestedBasicSalary, rounded to 2 decimals. */
  suggestedDeduction: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const toDateKey = (d: Date): string => {
  // Compare by local calendar date, not timestamp, so timezone-of-day
  // doesn't cause a record to land on the wrong day.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMonthDateRange = (month: number, year: number): { start: Date; end: Date } => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of the month
  return { start, end };
};

/** Every calendar date in [start, end] (inclusive) that isn't a weekly off day or a holiday. */
export const getWorkingDaysInRange = (
  start: Date,
  end: Date,
  holidays: HolidayLite[] = [],
  weeklyOffDays: number[] = [0, 6]
): Date[] => {
  const holidayKeys = new Set(holidays.map((h) => toDateKey(h.date)));
  const days: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endKey = toDateKey(end);

  while (toDateKey(cursor) <= endKey) {
    const isWeeklyOff = weeklyOffDays.includes(cursor.getDay());
    const isHoliday = holidayKeys.has(toDateKey(cursor));
    if (!isWeeklyOff && !isHoliday) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};

const isDateWithinLeave = (date: Date, leave: ApprovedLeaveLite): boolean => {
  const key = toDateKey(date);
  return toDateKey(leave.startDate) <= key && key <= toDateKey(leave.endDate);
};

/**
 * Computes a full attendance-and-leave-aware payroll breakdown for one
 * employee for one month. Every working day in the month is classified
 * exactly once, in this priority order:
 *   1. Has an Attendance record → use its status (PRESENT/LATE/HALF_DAY
 *      count as worked; HALF_DAY prorates at 0.5 day).
 *   2. No Attendance record, but covered by an approved leave → paid
 *      leave (no deduction) unless the leave type is UNPAID.
 *   3. Neither → unpaid absence.
 */
export const computePayrollBreakdown = (input: PayrollCalculationInput): PayrollBreakdown => {
  const { month, year, baseSalary, attendanceRecords, approvedLeaves, holidays, weeklyOffDays = [0, 6] } = input;
  const { start, end } = getMonthDateRange(month, year);
  const workingDates = getWorkingDaysInRange(start, end, holidays, weeklyOffDays);

  const attendanceByDate = new Map<string, string>();
  for (const record of attendanceRecords) {
    attendanceByDate.set(toDateKey(record.date), record.status);
  }

  let presentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let absentDays = 0;

  for (const day of workingDates) {
    const status = attendanceByDate.get(toDateKey(day));

    if (status) {
      if (status === 'HALF_DAY') {
        halfDays += 1;
      } else if (status === 'LATE') {
        presentDays += 1;
        lateDays += 1;
      } else if (status === 'ABSENT') {
        absentDays += 1;
      } else {
        // PRESENT, ON_LEAVE, or any future status defaults to worked.
        presentDays += 1;
      }
      continue;
    }

    const coveringLeave = approvedLeaves.find((leave) => isDateWithinLeave(day, leave));
    if (coveringLeave) {
      const dayContribution = coveringLeave.isHalfDay ? 0.5 : 1;
      if (coveringLeave.leaveType.toUpperCase() === 'UNPAID') {
        unpaidLeaveDays += dayContribution;
      } else {
        paidLeaveDays += dayContribution;
      }
      continue;
    }

    absentDays += 1;
  }

  const workingDays = workingDates.length;
  const unpayableDays = unpaidLeaveDays + absentDays + halfDays * 0.5;
  const payableDays = Math.max(0, workingDays - unpayableDays);

  const perDayRate = workingDays > 0 ? baseSalary / workingDays : 0;
  const suggestedBasicSalary = round2(perDayRate * payableDays);
  const suggestedDeduction = round2(Math.max(0, baseSalary - suggestedBasicSalary));

  return {
    month,
    year,
    workingDays,
    presentDays,
    lateDays,
    halfDays,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    payableDays,
    baseSalary: round2(baseSalary),
    perDayRate: round2(perDayRate),
    suggestedBasicSalary,
    suggestedDeduction,
  };
};
