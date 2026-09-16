import { buildReconciliationFlags, EmployeeReconciliationInput } from '../reconciliation.service';

const clean: EmployeeReconciliationInput = {
  absentDays: 0,
  unpaidLeaveDays: 0,
  workingDays: 22,
  presentDays: 22,
  anomalyCount: 0,
  pendingLeaveCount: 0,
  pendingRegularizationCount: 0,
  payslipAlreadyExists: false,
};

describe('buildReconciliationFlags', () => {
  it('returns no flags for a clean month', () => {
    expect(buildReconciliationFlags(clean)).toEqual([]);
  });

  it('flags pending leave requests', () => {
    const flags = buildReconciliationFlags({ ...clean, pendingLeaveCount: 2 });
    expect(flags).toEqual([expect.objectContaining({ type: 'PENDING_LEAVE_REQUESTS' })]);
    expect(flags[0].message).toContain('2 leave requests');
  });

  it('singularizes a count of one', () => {
    const flags = buildReconciliationFlags({ ...clean, pendingLeaveCount: 1 });
    expect(flags[0].message).toContain('1 leave request ');
  });

  it('flags pending regularization requests', () => {
    const flags = buildReconciliationFlags({ ...clean, pendingRegularizationCount: 3 });
    expect(flags).toEqual([expect.objectContaining({ type: 'PENDING_REGULARIZATIONS' })]);
  });

  it('flags no attendance recorded when working days exist but nothing was logged', () => {
    const flags = buildReconciliationFlags({ ...clean, presentDays: 0, absentDays: 0, workingDays: 22 });
    expect(flags).toEqual([expect.objectContaining({ type: 'NO_ATTENDANCE_RECORDED' })]);
  });

  it('does not flag no-attendance when there are zero working days in the month', () => {
    const flags = buildReconciliationFlags({ ...clean, workingDays: 0, presentDays: 0, absentDays: 0 });
    expect(flags.find((f) => f.type === 'NO_ATTENDANCE_RECORDED')).toBeUndefined();
  });

  it('flags unpaid absences', () => {
    const flags = buildReconciliationFlags({ ...clean, absentDays: 3, presentDays: 19 });
    expect(flags).toEqual([expect.objectContaining({ type: 'UNPAID_ABSENCES' })]);
  });

  it('flags unpaid leave', () => {
    const flags = buildReconciliationFlags({ ...clean, unpaidLeaveDays: 2, presentDays: 20 });
    expect(flags).toEqual([expect.objectContaining({ type: 'UNPAID_LEAVE' })]);
  });

  it('flags attendance anomalies', () => {
    const flags = buildReconciliationFlags({ ...clean, anomalyCount: 1 });
    expect(flags).toEqual([expect.objectContaining({ type: 'ATTENDANCE_ANOMALY' })]);
  });

  it('flags when a payslip already exists', () => {
    const flags = buildReconciliationFlags({ ...clean, payslipAlreadyExists: true });
    expect(flags).toEqual([expect.objectContaining({ type: 'PAYSLIP_ALREADY_GENERATED' })]);
  });

  it('returns multiple flags together, in priority order', () => {
    const flags = buildReconciliationFlags({
      ...clean,
      presentDays: 15,
      absentDays: 2,
      unpaidLeaveDays: 1,
      anomalyCount: 1,
      pendingLeaveCount: 1,
      pendingRegularizationCount: 1,
      payslipAlreadyExists: true,
    });
    expect(flags.map((f) => f.type)).toEqual([
      'PENDING_LEAVE_REQUESTS',
      'PENDING_REGULARIZATIONS',
      'UNPAID_ABSENCES',
      'UNPAID_LEAVE',
      'ATTENDANCE_ANOMALY',
      'PAYSLIP_ALREADY_GENERATED',
    ]);
  });
});
