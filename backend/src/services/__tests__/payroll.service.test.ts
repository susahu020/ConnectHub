import { getMonthDateRange, getWorkingDaysInRange, computePayrollBreakdown } from '../payroll.service';

describe('getMonthDateRange', () => {
  it('returns the first and last calendar day of the given month', () => {
    const { start, end } = getMonthDateRange(2, 2026); // February 2026 (not a leap year)
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(1);
    expect(end.getDate()).toBe(28);
    expect(end.getMonth()).toBe(1);
  });

  it('handles a leap-year February correctly', () => {
    const { end } = getMonthDateRange(2, 2028);
    expect(end.getDate()).toBe(29);
  });
});

describe('getWorkingDaysInRange', () => {
  it('excludes weekends by default (Sat/Sun)', () => {
    // Jan 2026: 1st is a Thursday, 31 days, weekday breakdown known.
    const { start, end } = getMonthDateRange(1, 2026);
    const days = getWorkingDaysInRange(start, end);
    for (const d of days) {
      expect([0, 6]).not.toContain(d.getDay());
    }
  });

  it('excludes holidays even on an otherwise-working weekday', () => {
    const start = new Date(2026, 0, 5); // Monday
    const end = new Date(2026, 0, 9); // Friday
    const holiday = new Date(2026, 0, 7); // Wednesday
    const days = getWorkingDaysInRange(start, end, [{ date: holiday }]);
    expect(days.length).toBe(4);
    expect(days.some((d) => d.getDate() === 7)).toBe(false);
  });

  it('respects a custom weekly-off configuration (e.g. Friday+Saturday)', () => {
    const start = new Date(2026, 0, 5); // Monday
    const end = new Date(2026, 0, 11); // Sunday
    const days = getWorkingDaysInRange(start, end, [], [5, 6]); // Fri, Sat off
    const weekdays = days.map((d) => d.getDay());
    expect(weekdays).not.toContain(5);
    expect(weekdays).not.toContain(6);
    expect(days.length).toBe(5); // Mon, Tue, Wed, Thu, Sun
  });
});

describe('computePayrollBreakdown', () => {
  // February 2026: 28 days, starts on a Sunday -> 20 working weekdays (Mon-Fri).
  const month = 2;
  const year = 2026;
  const baseSalary = 2000;

  it('pays the full base salary for a perfect attendance month with no leave/absence', () => {
    const { start, end } = getMonthDateRange(month, year);
    const workingDays = getWorkingDaysInRange(start, end);
    const attendanceRecords = workingDays.map((date) => ({ date, status: 'PRESENT' }));

    const breakdown = computePayrollBreakdown({
      month,
      year,
      baseSalary,
      attendanceRecords,
      approvedLeaves: [],
      holidays: [],
    });

    expect(breakdown.workingDays).toBe(workingDays.length);
    expect(breakdown.presentDays).toBe(workingDays.length);
    expect(breakdown.absentDays).toBe(0);
    expect(breakdown.payableDays).toBe(workingDays.length);
    expect(breakdown.suggestedBasicSalary).toBe(baseSalary);
    expect(breakdown.suggestedDeduction).toBe(0);
  });

  it('deducts pay for unpaid absences (no attendance record, no leave)', () => {
    const { start, end } = getMonthDateRange(month, year);
    const workingDays = getWorkingDaysInRange(start, end);
    // Only record attendance for all but 2 working days -> 2 unpaid absences.
    const attendanceRecords = workingDays.slice(2).map((date) => ({ date, status: 'PRESENT' }));

    const breakdown = computePayrollBreakdown({
      month,
      year,
      baseSalary,
      attendanceRecords,
      approvedLeaves: [],
      holidays: [],
    });

    expect(breakdown.absentDays).toBe(2);
    expect(breakdown.payableDays).toBe(workingDays.length - 2);
    const expectedPerDay = baseSalary / workingDays.length;
    expect(breakdown.suggestedBasicSalary).toBeCloseTo(expectedPerDay * (workingDays.length - 2), 2);
    expect(breakdown.suggestedDeduction).toBeGreaterThan(0);
  });

  it('does not deduct for a day covered by approved paid leave (e.g. ANNUAL)', () => {
    const { start, end } = getMonthDateRange(month, year);
    const workingDays = getWorkingDaysInRange(start, end);
    const leaveDay = workingDays[0];
    const attendanceRecords = workingDays.slice(1).map((date) => ({ date, status: 'PRESENT' }));

    const breakdown = computePayrollBreakdown({
      month,
      year,
      baseSalary,
      attendanceRecords,
      approvedLeaves: [{ startDate: leaveDay, endDate: leaveDay, leaveType: 'ANNUAL' }],
      holidays: [],
    });

    expect(breakdown.paidLeaveDays).toBe(1);
    expect(breakdown.unpaidLeaveDays).toBe(0);
    expect(breakdown.absentDays).toBe(0);
    expect(breakdown.payableDays).toBe(workingDays.length); // paid leave doesn't reduce payable days
    expect(breakdown.suggestedBasicSalary).toBe(baseSalary);
  });

  it('does deduct for a day covered by approved UNPAID leave', () => {
    const { start, end } = getMonthDateRange(month, year);
    const workingDays = getWorkingDaysInRange(start, end);
    const leaveDay = workingDays[0];
    const attendanceRecords = workingDays.slice(1).map((date) => ({ date, status: 'PRESENT' }));

    const breakdown = computePayrollBreakdown({
      month,
      year,
      baseSalary,
      attendanceRecords,
      approvedLeaves: [{ startDate: leaveDay, endDate: leaveDay, leaveType: 'UNPAID' }],
      holidays: [],
    });

    expect(breakdown.unpaidLeaveDays).toBe(1);
    expect(breakdown.payableDays).toBe(workingDays.length - 1);
    expect(breakdown.suggestedBasicSalary).toBeLessThan(baseSalary);
  });

  it('counts a half-day UNPAID leave as 0.5 unpaidLeaveDays, not a full day', () => {
    const { start, end } = getMonthDateRange(month, year);
    const workingDays = getWorkingDaysInRange(start, end);
    const leaveDay = workingDays[0];
    const attendanceRecords = workingDays.slice(1).map((date) => ({ date, status: 'PRESENT' }));

    const breakdown = computePayrollBreakdown({
      month,
      year,
      baseSalary,
      attendanceRecords,
      approvedLeaves: [{ startDate: leaveDay, endDate: leaveDay, leaveType: 'UNPAID', isHalfDay: true }],
      holidays: [],
    });

    expect(breakdown.unpaidLeaveDays).toBe(0.5);
    expect(breakdown.payableDays).toBe(workingDays.length - 0.5);
  });

  it('counts a half-day paid leave (e.g. ANNUAL) as 0.5 paidLeaveDays with no pay deduction', () => {
    const { start, end } = getMonthDateRange(month, year);
    const workingDays = getWorkingDaysInRange(start, end);
    const leaveDay = workingDays[0];
    const attendanceRecords = workingDays.slice(1).map((date) => ({ date, status: 'PRESENT' }));

    const breakdown = computePayrollBreakdown({
      month,
      year,
      baseSalary,
      attendanceRecords,
      approvedLeaves: [{ startDate: leaveDay, endDate: leaveDay, leaveType: 'ANNUAL', isHalfDay: true }],
      holidays: [],
    });

    expect(breakdown.paidLeaveDays).toBe(0.5);
    expect(breakdown.payableDays).toBe(workingDays.length);
  });

  it('prorates a HALF_DAY as 0.5 of a payable day', () => {
    const { start, end } = getMonthDateRange(month, year);
    const workingDays = getWorkingDaysInRange(start, end);
    const attendanceRecords = [
      { date: workingDays[0], status: 'HALF_DAY' },
      ...workingDays.slice(1).map((date) => ({ date, status: 'PRESENT' })),
    ];

    const breakdown = computePayrollBreakdown({
      month,
      year,
      baseSalary,
      attendanceRecords,
      approvedLeaves: [],
      holidays: [],
    });

    expect(breakdown.halfDays).toBe(1);
    expect(breakdown.payableDays).toBe(workingDays.length - 0.5);
  });

  it('counts LATE as a full present day for pay purposes, while still tracking it separately', () => {
    const { start, end } = getMonthDateRange(month, year);
    const workingDays = getWorkingDaysInRange(start, end);
    const attendanceRecords = [
      { date: workingDays[0], status: 'LATE' },
      ...workingDays.slice(1).map((date) => ({ date, status: 'PRESENT' })),
    ];

    const breakdown = computePayrollBreakdown({
      month,
      year,
      baseSalary,
      attendanceRecords,
      approvedLeaves: [],
      holidays: [],
    });

    expect(breakdown.lateDays).toBe(1);
    expect(breakdown.presentDays).toBe(workingDays.length); // LATE still counts toward presentDays
    expect(breakdown.payableDays).toBe(workingDays.length); // and is fully payable
  });

  it('never produces a negative payable-days figure even with more deductions than working days', () => {
    const breakdown = computePayrollBreakdown({
      month,
      year,
      baseSalary,
      attendanceRecords: [],
      approvedLeaves: [{ startDate: new Date(year, month - 1, 1), endDate: new Date(year, month, 0), leaveType: 'UNPAID' }],
      holidays: [],
    });

    expect(breakdown.payableDays).toBeGreaterThanOrEqual(0);
  });

  it('returns a zero per-day rate (not NaN/Infinity) when there are no working days configured', () => {
    const breakdown = computePayrollBreakdown({
      month,
      year,
      baseSalary,
      attendanceRecords: [],
      approvedLeaves: [],
      holidays: [],
      weeklyOffDays: [0, 1, 2, 3, 4, 5, 6], // every day off, degenerate case
    });

    expect(breakdown.workingDays).toBe(0);
    expect(breakdown.perDayRate).toBe(0);
    expect(breakdown.suggestedBasicSalary).toBe(0);
    expect(Number.isFinite(breakdown.perDayRate)).toBe(true);
  });
});
