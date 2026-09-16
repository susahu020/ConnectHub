// ==========================================
// PAYROLL RECONCILIATION REPORT
// ==========================================
// Every piece of data this report surfaces already exists elsewhere
// (payroll.service.ts's per-employee breakdown, attendanceAnomaly's
// flags, pending LeaveRequest/AttendanceRegularization counts, whether a
// Payslip row exists yet) — this module's only job is turning "here's what
// we know about one employee this month" into a short, skimmable list of
// reasons an Admin might want to look before finalizing payroll, rather
// than everyone having to notice the discrepancy themselves inside a full
// payslip generation flow.
//
// Deliberately advisory: nothing here blocks payroll generation. It's a
// pre-flight checklist, not a gate — same "advisory, never authoritative
// on its own" spirit as every other automation added to this module.

export type ReconciliationFlagType =
  | 'UNPAID_ABSENCES'
  | 'UNPAID_LEAVE'
  | 'ATTENDANCE_ANOMALY'
  | 'PENDING_LEAVE_REQUESTS'
  | 'PENDING_REGULARIZATIONS'
  | 'PAYSLIP_ALREADY_GENERATED'
  | 'NO_ATTENDANCE_RECORDED';

export interface ReconciliationFlag {
  type: ReconciliationFlagType;
  message: string;
}

export interface EmployeeReconciliationInput {
  absentDays: number;
  unpaidLeaveDays: number;
  workingDays: number;
  presentDays: number;
  anomalyCount: number;
  pendingLeaveCount: number;
  pendingRegularizationCount: number;
  payslipAlreadyExists: boolean;
}

/**
 * Flags for one employee's month, in priority order (most action-needed
 * first) — the UI shows these as-is without needing to re-sort. Pure/DB-free;
 * hr.controller.ts gathers the counts and calls this per employee.
 */
export const buildReconciliationFlags = (input: EmployeeReconciliationInput): ReconciliationFlag[] => {
  const flags: ReconciliationFlag[] = [];

  if (input.pendingLeaveCount > 0) {
    flags.push({
      type: 'PENDING_LEAVE_REQUESTS',
      message: `${input.pendingLeaveCount} leave request${input.pendingLeaveCount === 1 ? '' : 's'} still awaiting a decision this month.`,
    });
  }
  if (input.pendingRegularizationCount > 0) {
    flags.push({
      type: 'PENDING_REGULARIZATIONS',
      message: `${input.pendingRegularizationCount} attendance correction request${input.pendingRegularizationCount === 1 ? '' : 's'} still pending review.`,
    });
  }
  if (input.workingDays > 0 && input.presentDays === 0 && input.absentDays === 0) {
    flags.push({
      type: 'NO_ATTENDANCE_RECORDED',
      message: 'No attendance recorded at all this month — worth confirming before running payroll.',
    });
  }
  if (input.absentDays > 0) {
    flags.push({
      type: 'UNPAID_ABSENCES',
      message: `${input.absentDays} unpaid absence day${input.absentDays === 1 ? '' : 's'} this month.`,
    });
  }
  if (input.unpaidLeaveDays > 0) {
    flags.push({
      type: 'UNPAID_LEAVE',
      message: `${input.unpaidLeaveDays} unpaid leave day${input.unpaidLeaveDays === 1 ? '' : 's'} this month.`,
    });
  }
  if (input.anomalyCount > 0) {
    flags.push({
      type: 'ATTENDANCE_ANOMALY',
      message: `${input.anomalyCount} attendance anomal${input.anomalyCount === 1 ? 'y' : 'ies'} flagged this month.`,
    });
  }
  if (input.payslipAlreadyExists) {
    flags.push({
      type: 'PAYSLIP_ALREADY_GENERATED',
      message: 'A payslip has already been generated for this month.',
    });
  }

  return flags;
};
