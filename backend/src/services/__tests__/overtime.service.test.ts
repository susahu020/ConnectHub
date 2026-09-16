import { computeOvertime, validateOvertimePolicy, DEFAULT_OVERTIME_POLICY, OvertimePolicy } from '../overtime.service';

describe('computeOvertime', () => {
  const enabledPolicy: OvertimePolicy = { enabled: true, dailyThresholdHours: 8, rateMultiplier: 1.5 };

  it('returns all zeros when the policy is disabled', () => {
    const result = computeOvertime({
      dailyRecords: [{ date: new Date(), workedMinutes: 600 }],
      basicSalary: 30000,
      workingDaysInMonth: 22,
      policy: DEFAULT_OVERTIME_POLICY,
    });
    expect(result).toEqual({ totalOvertimeHours: 0, hourlyRate: 0, totalOvertimePay: 0, appliedRule: false });
  });

  it('returns zero when nobody worked past the threshold', () => {
    const result = computeOvertime({
      dailyRecords: [{ date: new Date(), workedMinutes: 7 * 60 }, { date: new Date(), workedMinutes: 8 * 60 }],
      basicSalary: 30000,
      workingDaysInMonth: 22,
      policy: enabledPolicy,
    });
    expect(result.totalOvertimeHours).toBe(0);
    expect(result.totalOvertimePay).toBe(0);
    expect(result.appliedRule).toBe(true);
  });

  it('computes overtime hours as time worked beyond the daily threshold, summed across days', () => {
    const result = computeOvertime({
      dailyRecords: [
        { date: new Date(), workedMinutes: 10 * 60 }, // 2h over
        { date: new Date(), workedMinutes: 9 * 60 }, // 1h over
        { date: new Date(), workedMinutes: 8 * 60 }, // exactly at threshold, 0 over
      ],
      basicSalary: 30000,
      workingDaysInMonth: 22,
      policy: enabledPolicy,
    });
    expect(result.totalOvertimeHours).toBe(3);
  });

  it('derives hourly rate from basicSalary / workingDays / dailyThresholdHours', () => {
    // 22000 / 22 working days = 1000/day; 1000/8h threshold = 125/hour.
    const result = computeOvertime({
      dailyRecords: [{ date: new Date(), workedMinutes: 10 * 60 }], // 2h overtime
      basicSalary: 22000,
      workingDaysInMonth: 22,
      policy: { enabled: true, dailyThresholdHours: 8, rateMultiplier: 1 },
    });
    expect(result.hourlyRate).toBe(125);
    expect(result.totalOvertimePay).toBe(250); // 2h * 125 * 1x
  });

  it('applies the rate multiplier to overtime pay', () => {
    const result = computeOvertime({
      dailyRecords: [{ date: new Date(), workedMinutes: 10 * 60 }], // 2h overtime
      basicSalary: 22000,
      workingDaysInMonth: 22,
      policy: { enabled: true, dailyThresholdHours: 8, rateMultiplier: 2 },
    });
    expect(result.totalOvertimePay).toBe(500); // 2h * 125 * 2x
  });

  it('never counts negative overtime for a short day', () => {
    const result = computeOvertime({
      dailyRecords: [{ date: new Date(), workedMinutes: 2 * 60 }],
      basicSalary: 22000,
      workingDaysInMonth: 22,
      policy: enabledPolicy,
    });
    expect(result.totalOvertimeHours).toBe(0);
  });

  it('is all zeros when workingDaysInMonth is zero (avoids divide-by-zero)', () => {
    const result = computeOvertime({
      dailyRecords: [{ date: new Date(), workedMinutes: 12 * 60 }],
      basicSalary: 22000,
      workingDaysInMonth: 0,
      policy: enabledPolicy,
    });
    expect(result).toEqual({ totalOvertimeHours: 0, hourlyRate: 0, totalOvertimePay: 0, appliedRule: false });
  });
});

describe('validateOvertimePolicy', () => {
  it('accepts a well-formed policy', () => {
    expect(validateOvertimePolicy({ enabled: true, dailyThresholdHours: 8, rateMultiplier: 1.5 }).valid).toBe(true);
  });

  it('accepts the shipped default (disabled) policy', () => {
    expect(validateOvertimePolicy(DEFAULT_OVERTIME_POLICY).valid).toBe(true);
  });

  it('rejects a non-object input', () => {
    expect(validateOvertimePolicy(null).valid).toBe(false);
  });

  it('rejects a missing enabled flag', () => {
    expect(validateOvertimePolicy({ dailyThresholdHours: 8, rateMultiplier: 1.5 }).valid).toBe(false);
  });

  it('rejects an out-of-range dailyThresholdHours', () => {
    expect(validateOvertimePolicy({ enabled: true, dailyThresholdHours: 0, rateMultiplier: 1.5 }).valid).toBe(false);
    expect(validateOvertimePolicy({ enabled: true, dailyThresholdHours: 25, rateMultiplier: 1.5 }).valid).toBe(false);
  });

  it('rejects a rateMultiplier below 1', () => {
    expect(validateOvertimePolicy({ enabled: true, dailyThresholdHours: 8, rateMultiplier: 0.5 }).valid).toBe(false);
  });
});
