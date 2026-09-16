import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AttendanceBreak } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/auditLog';
import { isAuthorizedApprover, isManagerOrAdmin, getVisibleUserIds } from '../services/approval.service';
import { getOrganizationSettings } from '../services/organization.service';
import {
  determineClockInStatus,
  determineFinalAttendanceStatus,
  computeWorkedMinutes,
} from '../services/attendanceStatus.service';
import { computePayrollBreakdown, getMonthDateRange, PayrollBreakdown } from '../services/payroll.service';
import {
  computeStatutoryDeductions,
  DEFAULT_STATUTORY_DEDUCTION_POLICY,
  StatutoryDeductionBreakdown,
  StatutoryDeductionPolicy,
} from '../services/statutoryDeductions.service';
import {
  detectAttendanceAnomalies,
  DEFAULT_ATTENDANCE_ANOMALY_POLICY,
  AttendanceAnomalyFlag,
  AttendanceAnomalyPolicy,
} from '../services/attendanceAnomaly.service';
import {
  checkAttendanceGeofence,
  DEFAULT_ATTENDANCE_GEOFENCE_POLICY,
  AttendanceGeofencePolicy,
} from '../services/geofence.service';
import { validateRegularizationRequest } from '../services/regularization.service';
import { buildReconciliationFlags } from '../services/reconciliation.service';
import { requiresSecondApproval } from '../services/expenseApproval.service';
import { computeOvertime, DEFAULT_OVERTIME_POLICY, OvertimeBreakdown, OvertimePolicy } from '../services/overtime.service';
import { generatePayslipPdfBuffer, savePayslipPdf } from '../services/payslipPdf.service';
import {
  ensureAccruedLeaveBalancesForEmployee,
  runLeaveAccrualForAllActiveEmployees,
  DEFAULT_LEAVE_ACCRUAL_POLICY,
} from '../services/leaveAccrual.service';

// Real-time update helper via Socket.io
const emitHRUpdate = (req: any, type: string) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('hr_update', { type });
  }
};

// Looks up the "HH:MM" expected start time for a user on a given date:
// their assigned Shift takes priority (a real schedule beats a guess),
// falling back to the org-wide default when no ShiftAssignment covers
// that day.
const getExpectedShiftStart = async (userId: string, date: Date): Promise<string> => {
  const assignment = await prisma.shiftAssignment.findFirst({
    where: { userId, startDate: { lte: date }, endDate: { gte: date } },
    include: { shift: true },
    orderBy: { createdAt: 'desc' },
  });

  if (assignment?.shift?.startTime) return assignment.shift.startTime;

  const settings = await getOrganizationSettings();
  return settings.defaultWorkStartTime;
};

// Gathers the raw Attendance/LeaveRequest/Holiday records for one employee's
// month and runs them through the pure payroll engine. This is the
// DB-fetching wrapper around services/payroll.service.ts's calculation —
// used both to preview a suggested payslip and to record an audit trail
// when one is actually generated.
const getPayrollBreakdownForEmployee = async (
  userId: string,
  month: number,
  year: number
): Promise<PayrollBreakdown & {
  employeeBaseSalary: number;
  hraAmount: number;
  otherAllowancesAmount: number;
  statutorySuggestion: StatutoryDeductionBreakdown;
  anomalies: AttendanceAnomalyFlag[];
  overtime: OvertimeBreakdown;
}> => {
  const { start, end } = getMonthDateRange(month, year);

  const [employee, attendanceRecords, approvedLeaves, holidays, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { baseSalary: true, hraAmount: true, otherAllowancesAmount: true } }),
    prisma.attendance.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { date: true, status: true },
    }),
    prisma.leaveRequest.findMany({
      where: { userId, status: 'APPROVED', startDate: { lte: end }, endDate: { gte: start } },
      select: { startDate: true, endDate: true, leaveType: true, isHalfDay: true },
    }),
    prisma.holiday.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true } }),
    getOrganizationSettings(),
  ]);

  // Kept as a separate await rather than folded into the Promise.all above —
  // TypeScript/Prisma's generated client can lose track of a select shape
  // when two different `findMany` calls against the *same* model appear
  // together in one array literal (it collapsed this one to the full
  // unselected Attendance type in practice, dropping `breaks` entirely).
  // Splitting it out is the reliable fix, at the cost of one extra
  // sequential round-trip. Only clocked-out days count — a day still in
  // progress (or never clocked out) has no worked-minutes total to measure
  // yet — and clockIn itself is never null on an Attendance row, so only
  // clockOut needs the not-null filter.
  const attendanceWithTimes = await prisma.attendance.findMany({
    where: { userId, date: { gte: start, lte: end }, clockOut: { not: null } },
    select: { date: true, clockIn: true, clockOut: true, breaks: { select: { startTime: true, endTime: true } } },
  });

  const baseSalary = employee?.baseSalary || 0;

  const breakdown = computePayrollBreakdown({
    month,
    year,
    baseSalary,
    attendanceRecords,
    approvedLeaves,
    holidays,
    weeklyOffDays: settings.weeklyOffDays,
  });

  // Estimate only — allowances aren't known yet at preview time, so this
  // uses the attendance-prorated basic as a stand-in for gross. The
  // authoritative figure (used for the payslip's stored audit trail) is
  // recomputed in generatePayslip/bulkGeneratePayslips once basic +
  // allowances are actually finalized.
  const statutoryPolicy: StatutoryDeductionPolicy = (settings as any).payrollStatutoryPolicy || DEFAULT_STATUTORY_DEDUCTION_POLICY;
  const statutorySuggestion = computeStatutoryDeductions({
    basicSalary: breakdown.suggestedBasicSalary,
    grossSalary: breakdown.suggestedBasicSalary,
    policy: statutoryPolicy,
  });

  const anomalyPolicy: AttendanceAnomalyPolicy = (settings as any).attendanceAnomalyPolicy || DEFAULT_ATTENDANCE_ANOMALY_POLICY;
  const anomalies = detectAttendanceAnomalies(
    {
      absentDays: breakdown.absentDays,
      lateDays: breakdown.lateDays,
      halfDays: breakdown.halfDays,
      unpaidLeaveDays: breakdown.unpaidLeaveDays,
    },
    anomalyPolicy
  );

  const overtimePolicy: OvertimePolicy = (settings as any).overtimePolicy || DEFAULT_OVERTIME_POLICY;
  const overtime = computeOvertime({
    dailyRecords: attendanceWithTimes.map((a) => ({
      date: a.date,
      workedMinutes: computeWorkedMinutes(a.clockIn!, a.clockOut!, a.breaks),
    })),
    basicSalary: breakdown.suggestedBasicSalary,
    workingDaysInMonth: breakdown.workingDays,
    policy: overtimePolicy,
  });

  return {
    ...breakdown,
    employeeBaseSalary: baseSalary,
    hraAmount: employee?.hraAmount || 0,
    otherAllowancesAmount: employee?.otherAllowancesAmount || 0,
    statutorySuggestion,
    anomalies,
    overtime,
  };
};

// Shared by generatePayslip and bulkGeneratePayslips so both produce an
// identically-formatted PDF from the same inputs. Never throws — a PDF
// failure (e.g. a transient Cloudinary error) shouldn't block the payslip
// record itself from being created; callers get `null` back and the
// payslip is simply saved without a fileUrl, same as before this feature
// existed.
const buildAndSavePayslipPdf = async (
  req: AuthenticatedRequest,
  employee: { id: string; firstName: string; lastName: string; designation: string | null },
  params: {
    month: number;
    year: number;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    attendanceSummary: PayrollBreakdown;
    statutoryDeductions?: StatutoryDeductionBreakdown | null;
    overtime?: OvertimeBreakdown | null;
  }
): Promise<string | null> => {
  try {
    const orgSettings = await getOrganizationSettings();
    const generatedByName = req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : 'Admin';

    const pdfBuffer = await generatePayslipPdfBuffer({
      orgName: orgSettings.orgName,
      orgAddress: orgSettings.address,
      orgSupportEmail: orgSettings.supportEmail,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeDesignation: employee.designation,
      employeeId: employee.id,
      month: params.month,
      year: params.year,
      basicSalary: params.basicSalary,
      allowances: params.allowances,
      deductions: params.deductions,
      netSalary: params.netSalary,
      status: 'UNPAID',
      generatedByName,
      generatedAt: new Date(),
      attendanceSummary: params.attendanceSummary,
      statutoryDeductions: params.statutoryDeductions || null,
      overtime: params.overtime || null,
    });

    return await savePayslipPdf(pdfBuffer, employee.id, params.month, params.year, req);
  } catch (error) {
    console.error(`Payslip PDF generation failed for employee ${employee.id}:`, error);
    return null;
  }
};

// ==========================================
// LEAVE MANAGEMENT
// ==========================================

export const getLeaves = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user?.role!;
    // Admins see every request; Managers see their own plus their direct
    // reports' (not the whole company's — see getVisibleUserIds); Employees
    // see only their own. Mirrors the scope `isAuthorizedApprover` already
    // enforces on the approve/reject action for the same data.
    const visibleUserIds = await getVisibleUserIds(req.user?.id!, role);

    const leaves = await prisma.leaveRequest.findMany({
      where: visibleUserIds ? { userId: { in: visibleUserIds } } : undefined,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, designation: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(leaves);
  } catch (error) {
    next(error);
  }
};

export const requestLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { leaveType, startDate, endDate, reason, isHalfDay, attachmentUrl } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      res.status(400).json({ message: 'All fields (leaveType, startDate, endDate, reason) are required.' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      res.status(400).json({ message: 'Invalid start or end date.' });
      return;
    }

    // Half-day only makes sense for a single day — comparing calendar date
    // keys rather than raw timestamps since the client sends plain
    // yyyy-mm-dd values that both parse to local midnight anyway, but this
    // is robust either way.
    const halfDay = !!isHalfDay;
    if (halfDay && start.toDateString() !== end.toDateString()) {
      res.status(400).json({ message: 'A half-day leave request must have the same start and end date.' });
      return;
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveType,
        startDate: start,
        endDate: end,
        reason,
        isHalfDay: halfDay,
        attachmentUrl: attachmentUrl || null,
        status: 'PENDING',
      },
    });

    // Trigger workflow automation engine on new leave request submission
    const { AutomationService } = require('../services/automation.service');
    const automationIo = req.app.get('io');
    AutomationService.trigger('LEAVE_REQUESTED', {
      requesterId: userId,
      leaveType,
    }, automationIo).catch((err: any) => console.error('[Automation] LEAVE_REQUESTED trigger failed:', err));

    emitHRUpdate(req, 'LEAVE');
    res.status(201).json(leave);
  } catch (error) {
    next(error);
  }
};

export const getLeaveBalances = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const asOfDate = new Date();

    const employee = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, joiningDate: true } });
    if (!employee) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const settings = await getOrganizationSettings();
    const policy = settings.leaveAccrualPolicy || DEFAULT_LEAVE_ACCRUAL_POLICY;

    // Brings this employee's balances up to date with what should have
    // accrued by now (see leaveAccrual.service.ts) rather than granting
    // the full annual quota upfront the first time this is called. Cheap
    // and idempotent, so it's safe to run on every fetch as a just-in-time
    // top-up between the daily background job's runs.
    await ensureAccruedLeaveBalancesForEmployee(employee, policy, asOfDate);

    const balances = await prisma.leaveBalance.findMany({
      where: { userId, year: asOfDate.getFullYear() },
    });

    res.status(200).json(balances);
  } catch (error) {
    next(error);
  }
};

export const updateLeaveStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user?.role!;
    if (!isManagerOrAdmin(role)) {
      res.status(403).json({ message: 'Forbidden. Only managers and admins can approve leaves.' });
      return;
    }

    const { id } = req.params;
    const { status, managerNotes } = req.body;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      res.status(400).json({ message: 'Status must be APPROVED or REJECTED.' });
      return;
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      res.status(404).json({ message: 'Leave request not found.' });
      return;
    }

    if (leaveRequest.status !== 'PENDING') {
      res.status(400).json({ message: 'Leave request is already processed.' });
      return;
    }

    if (leaveRequest.userId === req.user?.id) {
      res.status(403).json({ message: 'You cannot approve or reject your own leave request. Ask another manager or admin to review it.' });
      return;
    }

    if (!(await isAuthorizedApprover(req.user!.id, role, leaveRequest.userId))) {
      res.status(403).json({ message: "Forbidden. Only this employee's reporting manager or an admin can approve or reject this leave request." });
      return;
    }

    if (status === 'APPROVED') {
      // Calculate leave days — a half-day request is always a single
      // calendar day (enforced at creation in requestLeave), so it always
      // deducts exactly 0.5 regardless of what the date-range math would
      // otherwise compute.
      const diffTime = Math.abs(leaveRequest.endDate.getTime() - leaveRequest.startDate.getTime());
      const diffDays = leaveRequest.isHalfDay ? 0.5 : Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const year = leaveRequest.startDate.getFullYear();

      // Find or create balance
      let balance = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveType_year: {
            userId: leaveRequest.userId,
            leaveType: leaveRequest.leaveType,
            year,
          },
        },
      });

      if (!balance) {
        // Create a default balance if none exists
        balance = await prisma.leaveBalance.create({
          data: {
            userId: leaveRequest.userId,
            leaveType: leaveRequest.leaveType,
            year,
            total: leaveRequest.leaveType === 'UNPAID' ? 30 : leaveRequest.leaveType === 'ANNUAL' ? 12 : 8,
            used: 0,
          },
        });
      }

      // Nothing anywhere — not this endpoint, not requestLeave, not the
      // frontend — previously checked this request against what's actually
      // left, so approving enough leave requests could push `used` past
      // `total` with no warning to the approving manager (who also has no
      // visibility into the requester's balance in the approval UI). That
      // silently defeats the entire point of tracking a balance.
      if (balance.used + diffDays > balance.total) {
        res.status(400).json({
          message: `Cannot approve: this would use ${balance.used + diffDays} of ${balance.total} ${leaveRequest.leaveType.toLowerCase()} days allocated for ${year} (${balance.total - balance.used} remaining). Reject it, or ask the employee to adjust the date range.`,
        });
        return;
      }

      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { used: balance.used + diffDays },
      });
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedById: req.user?.id!,
        managerNotes: managerNotes || null,
      },
    });

    emitHRUpdate(req, 'LEAVE');
    logAudit(req, 'LEAVE_REQUEST_' + status, `${status === 'APPROVED' ? 'Approved' : 'Rejected'} leave request ${id} for user ${leaveRequest.userId} (${leaveRequest.leaveType}, ${leaveRequest.startDate.toDateString()} - ${leaveRequest.endDate.toDateString()}).`);
    res.status(200).json(updatedLeave);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ATTENDANCE MANAGEMENT
// ==========================================

export const getTodayStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: { userId, date: today },
      include: { breaks: true },
    });

    res.status(200).json(attendance);
  } catch (error) {
    next(error);
  }
};

export const clockIn = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    const existing = await prisma.attendance.findFirst({
      where: { userId, date: today },
    });

    if (existing) {
      res.status(400).json({ message: 'Already clocked in for today.' });
      return;
    }

    const { location, notes, latitude, longitude } = req.body;
    const clockInAt = new Date();

    // Real Late detection: prefer the employee's assigned shift for today,
    // fall back to the org-wide default start time. Previously this was
    // hardcoded to PRESENT regardless of arrival time.
    const expectedStart = await getExpectedShiftStart(userId, today);
    const settings = await getOrganizationSettings();
    const status = determineClockInStatus(clockInAt, expectedStart, settings.lateGraceMinutes);

    // Geofence check — see services/geofence.service.ts. Coordinates are
    // optional client input (a browser/device with no location permission
    // just won't send them), only ever validated against server-side org
    // policy, and only ever block the request when the Admin has
    // explicitly turned enforceBlock on.
    const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
    const geofencePolicy: AttendanceGeofencePolicy = (settings as any).attendanceGeofencePolicy || DEFAULT_ATTENDANCE_GEOFENCE_POLICY;
    const geofenceResult = checkAttendanceGeofence(hasCoords ? { latitude, longitude } : null, geofencePolicy);

    if (geofenceResult.blocked) {
      res.status(403).json({ message: geofenceResult.message || 'Clock-in blocked: location requirements not met.' });
      return;
    }

    const log = await prisma.attendance.create({
      data: {
        userId,
        date: today,
        clockIn: clockInAt,
        status,
        ipAddress: req.ip || null,
        location: location || null,
        latitude: hasCoords ? latitude : null,
        longitude: hasCoords ? longitude : null,
        locationVerified: geofenceResult.applicable ? geofenceResult.withinFence : null,
        distanceFromOfficeMeters: geofenceResult.distanceMeters,
        notes: notes || null,
      },
    });

    emitHRUpdate(req, 'ATTENDANCE');
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
};

export const clockOut = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: { userId, date: today, clockOut: null },
      include: { breaks: true },
    });

    if (!attendance) {
      res.status(400).json({ message: 'No active clock-in session found for today.' });
      return;
    }

    const { notes } = req.body;
    const clockOutAt = new Date();

    // Check if there is an open break, end it
    const openBreak = attendance.breaks.find((b: AttendanceBreak) => !b.endTime);
    let closedBreaks = attendance.breaks;

    if (openBreak) {
      const updatedBreak = await prisma.attendanceBreak.update({
        where: { id: openBreak.id },
        data: { endTime: clockOutAt },
      });
      closedBreaks = attendance.breaks.map((b: AttendanceBreak) => (b.id === updatedBreak.id ? updatedBreak : b));
    }

    // Real Half-Day detection: below the org's configured worked-hours
    // threshold downgrades the day regardless of how it started (even a
    // punctual arrival can end up a half day if someone leaves early).
    // LATE from clock-in is preserved unless it gets downgraded to
    // HALF_DAY, since arrival lateness and total hours worked are
    // independent signals worth keeping distinct for payroll.
    const settings = await getOrganizationSettings();
    const workedMinutes = computeWorkedMinutes(attendance.clockIn, clockOutAt, closedBreaks);
    const entryStatus: 'PRESENT' | 'LATE' = attendance.status === 'LATE' ? 'LATE' : 'PRESENT';
    const finalStatus = determineFinalAttendanceStatus(entryStatus, workedMinutes, settings.halfDayThresholdHours);

    const log = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: clockOutAt,
        status: finalStatus,
        notes: notes ? `${attendance.notes || ''}\nClockOut: ${notes}`.trim() : attendance.notes,
      },
      include: { breaks: true },
    });

    emitHRUpdate(req, 'ATTENDANCE');
    res.status(200).json(log);
  } catch (error) {
    next(error);
  }
};

export const startBreak = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: { userId, date: today, clockOut: null },
    });

    if (!attendance) {
      res.status(400).json({ message: 'Must be clocked in to take a break.' });
      return;
    }

    const existingBreak = await prisma.attendanceBreak.findFirst({
      where: { attendanceId: attendance.id, endTime: null },
    });

    if (existingBreak) {
      res.status(400).json({ message: 'Break is already in progress.' });
      return;
    }

    const attendanceBreak = await prisma.attendanceBreak.create({
      data: {
        attendanceId: attendance.id,
        startTime: new Date(),
      },
    });

    emitHRUpdate(req, 'ATTENDANCE');
    res.status(201).json(attendanceBreak);
  } catch (error) {
    next(error);
  }
};

export const endBreak = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: { userId, date: today, clockOut: null },
    });

    if (!attendance) {
      res.status(400).json({ message: 'No active clock-in session.' });
      return;
    }

    const activeBreak = await prisma.attendanceBreak.findFirst({
      where: { attendanceId: attendance.id, endTime: null },
    });

    if (!activeBreak) {
      res.status(400).json({ message: 'No active break found.' });
      return;
    }

    const endedBreak = await prisma.attendanceBreak.update({
      where: { id: activeBreak.id },
      data: { endTime: new Date() },
    });

    emitHRUpdate(req, 'ATTENDANCE');
    res.status(200).json(endedBreak);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user?.role!;
    const { userId: queryUserId, all } = req.query;
    const visibleUserIds = await getVisibleUserIds(req.user?.id!, role);
    let logs;

    if (all === 'true' && isManagerOrAdmin(role)) {
      // "All" means all records the caller may see — every user in the
      // company for an Admin, or the caller's own + their direct reports'
      // for a Manager (not every employee regardless of who they report to).
      logs = await prisma.attendance.findMany({
        where: visibleUserIds ? { userId: { in: visibleUserIds } } : undefined,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, designation: true } },
          breaks: true,
        },
        orderBy: { date: 'desc' },
      });
    } else {
      // A single-user lookup via ?userId= is only honored if that user is
      // actually within the caller's visibility (self, or — for a Manager —
      // a direct report). Otherwise it silently falls back to "my own",
      // rather than letting a Manager pull an arbitrary employee's
      // attendance by guessing/enumerating their userId.
      const requestedId = queryUserId ? String(queryUserId) : req.user?.id!;
      const targetUserId =
        !visibleUserIds || visibleUserIds.includes(requestedId) ? requestedId : req.user?.id!;
      logs = await prisma.attendance.findMany({
        where: { userId: targetUserId },
        include: { breaks: true },
        orderBy: { date: 'desc' },
      });
    }

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// HOLIDAY MANAGEMENT
// ==========================================

export const getHolidays = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' },
    });
    res.status(200).json(holidays);
  } catch (error) {
    next(error);
  }
};

export const createHoliday = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isManagerOrAdmin(req.user?.role!)) {
      res.status(403).json({ message: 'Forbidden. Only managers and admins can add holidays.' });
      return;
    }

    const { name, date, description, isMandatory } = req.body;
    if (!name || !date) {
      res.status(400).json({ message: 'Name and date are required.' });
      return;
    }

    const holidayDate = new Date(date);
    if (isNaN(holidayDate.getTime())) {
      res.status(400).json({ message: 'Invalid holiday date.' });
      return;
    }

    const existing = await prisma.holiday.findUnique({
      where: { date: holidayDate },
    });

    if (existing) {
      res.status(400).json({ message: 'A holiday on this date already exists.' });
      return;
    }

    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: holidayDate,
        description: description || null,
        isMandatory: isMandatory !== undefined ? isMandatory : true,
      },
    });

    emitHRUpdate(req, 'HOLIDAY');
    res.status(201).json(holiday);
  } catch (error) {
    next(error);
  }
};

export const deleteHoliday = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isManagerOrAdmin(req.user?.role!)) {
      res.status(403).json({ message: 'Forbidden. Only managers and admins can delete holidays.' });
      return;
    }

    const { id } = req.params;

    await prisma.holiday.delete({
      where: { id },
    });

    emitHRUpdate(req, 'HOLIDAY');
    res.status(200).json({ message: 'Holiday deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPENSE CLAIMS MANAGEMENT
// ==========================================

export const getExpenseClaims = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user?.role!;
    const visibleUserIds = await getVisibleUserIds(req.user?.id!, role);

    const claims = await prisma.expenseClaim.findMany({
      where: visibleUserIds ? { userId: { in: visibleUserIds } } : undefined,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, designation: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(claims);
  } catch (error) {
    next(error);
  }
};

export const createExpenseClaim = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { title, category, amount, currency, description, receiptUrl } = req.body;

    if (!title || !category || amount === undefined) {
      res.status(400).json({ message: 'Title, category, and amount are required.' });
      return;
    }

    const claim = await prisma.expenseClaim.create({
      data: {
        userId,
        title,
        category,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        description: description || null,
        receiptUrl: receiptUrl || null,
        status: 'PENDING',
      },
    });

    emitHRUpdate(req, 'EXPENSE');
    res.status(201).json(claim);
  } catch (error) {
    next(error);
  }
};

export const updateExpenseStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isManagerOrAdmin(req.user?.role!)) {
      res.status(403).json({ message: 'Forbidden. Only managers and admins can approve expenses.' });
      return;
    }

    const { id } = req.params;
    const { status, managerNotes } = req.body;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      res.status(400).json({ message: 'Status must be APPROVED or REJECTED.' });
      return;
    }

    const claim = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!claim) {
      res.status(404).json({ message: 'Expense claim not found.' });
      return;
    }

    if (claim.userId === req.user?.id) {
      res.status(403).json({ message: 'You cannot approve or reject your own expense claim. Ask another manager or admin to review it.' });
      return;
    }

    if (claim.status === 'APPROVED' || claim.status === 'REJECTED') {
      res.status(400).json({ message: `This claim has already been ${claim.status.toLowerCase()}.` });
      return;
    }

    if (claim.status === 'PENDING') {
      // First-tier decision — same reporting-line authorization as before.
      if (!(await isAuthorizedApprover(req.user!.id, req.user?.role!, claim.userId))) {
        res.status(403).json({ message: "Forbidden. Only this employee's reporting manager or an admin can approve or reject this expense claim." });
        return;
      }

      if (status === 'REJECTED') {
        const updatedClaim = await prisma.expenseClaim.update({
          where: { id },
          data: { status: 'REJECTED', approvedById: req.user?.id!, managerNotes: managerNotes || null },
        });
        emitHRUpdate(req, 'EXPENSE');
        logAudit(req, 'EXPENSE_CLAIM_REJECTED', `Rejected expense claim ${id} for user ${claim.userId} (amount: ${claim.amount}).`);
        res.status(200).json(updatedClaim);
        return;
      }

      // Approving — check whether this claim is large enough to need a
      // second, different Admin's sign-off before it's actually finalized.
      const settings = await getOrganizationSettings();
      const needsSecondApproval = requiresSecondApproval(claim.amount, (settings as any).expenseSecondApprovalThreshold ?? null);

      const updatedClaim = await prisma.expenseClaim.update({
        where: { id },
        data: {
          status: needsSecondApproval ? 'PENDING_SECOND_APPROVAL' : 'APPROVED',
          approvedById: req.user?.id!,
          managerNotes: managerNotes || null,
        },
      });

      emitHRUpdate(req, 'EXPENSE');
      logAudit(
        req,
        'EXPENSE_CLAIM_APPROVED',
        needsSecondApproval
          ? `First-tier approval on expense claim ${id} for user ${claim.userId} (amount: ${claim.amount}) — awaiting a second Admin's approval.`
          : `Approved expense claim ${id} for user ${claim.userId} (amount: ${claim.amount}).`
      );
      res.status(200).json(updatedClaim);
      return;
    }

    // claim.status === 'PENDING_SECOND_APPROVAL' — second-tier decision.
    // Restricted to Admins (an escalation beyond the direct manager, by
    // design), and must be a different person than whoever gave the first
    // approval, so the same person can't sign off on both tiers of a
    // claim that specifically needed two sets of eyes.
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'This claim requires a second Admin approval — only an Admin can decide on it at this stage.' });
      return;
    }
    if (claim.approvedById === req.user?.id) {
      res.status(403).json({ message: 'You already gave the first approval on this claim — a different Admin must give the second.' });
      return;
    }

    const updatedClaim = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status,
        secondApprovedById: req.user?.id!,
        secondApproverNotes: managerNotes || null,
        secondApprovedAt: new Date(),
      },
    });

    emitHRUpdate(req, 'EXPENSE');
    logAudit(req, 'EXPENSE_CLAIM_' + status, `Second-tier ${status === 'APPROVED' ? 'approved' : 'rejected'} expense claim ${id} for user ${claim.userId} (amount: ${claim.amount}).`);
    res.status(200).json(updatedClaim);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PAYSLIP MANAGEMENT
// ==========================================

export const getPayslips = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user?.role!;
    let payslips;

    // Payslips carry salary figures — unlike leave/attendance, this isn't
    // shared team-visibility territory. Only Admins (payroll/HR) see everyone's;
    // Managers see their own payslips only, same as any other employee.
    if (role === 'ADMIN') {
      payslips = await prisma.payslip.findMany({
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, designation: true } },
          generatedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
    } else {
      payslips = await prisma.payslip.findMany({
        where: { userId: req.user?.id! },
        include: {
          generatedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
    }

    res.status(200).json(payslips);
  } catch (error) {
    next(error);
  }
};

export const generatePayslip = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can generate payslips.' });
      return;
    }

    const { employeeId, month, year, basicSalary, allowances, deductions, notes, fileUrl, updateStoredSalary } = req.body;

    if (!employeeId || month === undefined || year === undefined || basicSalary === undefined) {
      res.status(400).json({ message: 'employeeId, month, year, and basicSalary are required.' });
      return;
    }

    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ message: 'Employee user not found.' });
      return;
    }

    if (employeeId === req.user?.id) {
      res.status(403).json({ message: 'You cannot generate your own payslip. Ask another admin to process this for you.' });
      return;
    }

    const basic = parseFloat(basicSalary);
    const allow = allowances ? parseFloat(allowances) : 0;
    const deduct = deductions ? parseFloat(deductions) : 0;
    const netSalary = basic + allow - deduct;

    // Server-computed (never trusts client input for this) attendance/leave
    // breakdown, stored purely as an audit trail of what the automation
    // suggested at generation time — it does not override the Admin's
    // basic/allowances/deductions entries above, which remain authoritative
    // for netSalary. This is what lets a payslip later be explained ("the
    // system saw 2 unpaid absences that month") even if the Admin adjusted
    // the final figures for a bonus, correction, etc.
    const attendanceSummary = await getPayrollBreakdownForEmployee(employeeId, parseInt(month), parseInt(year));

    // Same audit-trail treatment for statutory deductions (PF/Professional
    // Tax/income-tax estimate), computed from the *final* basic+allowances
    // the Admin actually entered above rather than the preview's estimate —
    // stored on the payslip so it can be explained later even though, like
    // the attendance breakdown, it never silently changes the Admin-entered
    // deductions/netSalary figures on its own.
    const orgSettingsForStatutory = await getOrganizationSettings();
    const statutoryPolicy: StatutoryDeductionPolicy = (orgSettingsForStatutory as any).payrollStatutoryPolicy || DEFAULT_STATUTORY_DEDUCTION_POLICY;
    const statutoryDeductions = computeStatutoryDeductions({
      basicSalary: basic,
      grossSalary: basic + allow,
      policy: statutoryPolicy,
    });

    // Auto-generate the payslip PDF unless the Admin explicitly supplied
    // their own fileUrl. Previously fileUrl was just a free-text field
    // nobody populated — payslips existed only as DB rows with nothing an
    // employee could actually download.
    const generatedFileUrl = fileUrl || (await buildAndSavePayslipPdf(req, employee, {
      month: parseInt(month),
      year: parseInt(year),
      basicSalary: basic,
      allowances: allow,
      deductions: deduct,
      netSalary,
      attendanceSummary,
      statutoryDeductions,
      overtime: attendanceSummary.overtime,
    }));

    const payslip = await prisma.payslip.create({
      data: {
        userId: employeeId,
        month: parseInt(month),
        year: parseInt(year),
        basicSalary: basic,
        allowances: allow,
        deductions: deduct,
        netSalary,
        status: 'UNPAID',
        generatedById: req.user?.id!,
        notes: notes || null,
        fileUrl: generatedFileUrl || null,
        attendanceSummary: attendanceSummary as any,
        statutoryDeductions: statutoryDeductions as any,
        anomalies: attendanceSummary.anomalies as any,
      },
    });

    // Fire the anomaly-detection trigger so an Admin who has a workflow
    // rule configured for it (e.g. "notify manager") gets pinged, on top
    // of it being visible in the payslip record itself. Fire-and-forget,
    // same pattern as EMPLOYEE_OFFBOARDED — a broken automation rule
    // should never block payslip generation.
    if (attendanceSummary.anomalies.length > 0) {
      const { AutomationService } = require('../services/automation.service');
      const anomalyIo = req.app.get('io');
      AutomationService.trigger('ATTENDANCE_ANOMALY_DETECTED', {
        employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        managerId: employee.managerId,
        month: parseInt(month),
        year: parseInt(year),
        anomalies: attendanceSummary.anomalies,
      }, anomalyIo).catch((err: any) => console.error('[Automation] ATTENDANCE_ANOMALY_DETECTED trigger failed:', err));
    }

    // Optional: keep User.baseSalary in sync with what was just entered,
    // so the *next* payslip for this employee can default to it instead
    // of starting blank again — see getEmployeeBaseSalary/
    // setEmployeeBaseSalary below. Opt-in (defaults to true from the
    // frontend's checkbox) rather than automatic, since not every
    // basicSalary entered here represents a new ongoing rate — a one-off
    // bonus-heavy month shouldn't silently become next month's default.
    if (updateStoredSalary !== false) {
      await prisma.user.update({
        where: { id: employeeId },
        data: { baseSalary: basic },
      });
    }

    emitHRUpdate(req, 'PAYSLIP');
    logAudit(req, 'PAYSLIP_GENERATED', `Generated ${month}/${year} payslip for user ${employeeId}: basic ${basic}, allowances ${allow}, deductions ${deduct}, net ${netSalary}.`);
    res.status(201).json(payslip);
  } catch (error) {
    next(error);
  }
};

// Feeds the "Generate Payslip" modal a suggested breakdown before the
// Admin commits to anything — working days, absences, unpaid leave,
// half-days, and a suggested pro-rated basic salary, computed from real
// Attendance/LeaveRequest data instead of asking the Admin to remember or
// hand-calculate it. Purely advisory: generatePayslip above still requires
// the Admin to submit final figures (which may match this exactly, or be
// deliberately overridden), and recomputes its own copy server-side for
// the audit trail rather than trusting whatever this returned.
export const previewPayrollCalculation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can preview payroll calculations.' });
      return;
    }

    const { employeeId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      res.status(400).json({ message: 'month and year query parameters are required.' });
      return;
    }

    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ message: 'Employee user not found.' });
      return;
    }

    const breakdown = await getPayrollBreakdownForEmployee(employeeId, parseInt(month as string), parseInt(year as string));
    res.status(200).json(breakdown);
  } catch (error) {
    next(error);
  }
};

// Runs the payroll calculation engine for every active employee at once
// (optionally scoped to a specific list) instead of the one-by-one modal
// flow. Fully automatic — unlike generatePayslip, there's no per-employee
// Admin review of the suggested figures before they're saved, so this is
// meant for "run this month's payroll" rather than exception handling;
// anyone whose numbers need a manual override should be adjusted via the
// single-employee flow (which supports editing before submission) either
// before or after a bulk run. Employees who already have a payslip for
// the requested month/year are skipped rather than duplicated.
export const bulkGeneratePayslips = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can run bulk payroll.' });
      return;
    }

    const { month, year, employeeIds } = req.body;
    if (month === undefined || year === undefined) {
      res.status(400).json({ message: 'month and year are required.' });
      return;
    }
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    const targetEmployees = Array.isArray(employeeIds) && employeeIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: employeeIds, not: req.user!.id } } })
      : await prisma.user.findMany({ where: { isActive: true, id: { not: req.user!.id } } });

    // Fetched once for the whole run rather than per-employee — it's an
    // org-wide policy, not something that varies per person.
    const orgSettingsForBulk = await getOrganizationSettings();
    const statutoryPolicyForBulk: StatutoryDeductionPolicy = (orgSettingsForBulk as any).payrollStatutoryPolicy || DEFAULT_STATUTORY_DEDUCTION_POLICY;

    const generated: Array<{ employeeId: string; payslipId: string; netSalary: number }> = [];
    const skippedExisting: string[] = [];
    const failed: Array<{ employeeId: string; error: string }> = [];
    const flagged: Array<{ employeeId: string; firstName: string; lastName: string; anomalies: AttendanceAnomalyFlag[] }> = [];
    const { AutomationService } = require('../services/automation.service');
    const anomalyIo = req.app.get('io');

    for (const employee of targetEmployees) {
      try {
        const existing = await prisma.payslip.findFirst({ where: { userId: employee.id, month: monthNum, year: yearNum } });
        if (existing) {
          skippedExisting.push(employee.id);
          continue;
        }

        const breakdown = await getPayrollBreakdownForEmployee(employee.id, monthNum, yearNum);
        // Convention: basicSalary stays the employee's full contractual
        // rate, allowances carries any computed overtime pay, deductions
        // carries the attendance-based reduction plus any enabled
        // statutory deductions (PF/Professional Tax/income-tax estimate)
        // — same fully-automatic treatment as the attendance proration
        // above, since bulk mode has no per-employee Admin review step.
        // netSalary = basic + allowances - deductions reflects all of it
        // exactly once, transparently, and both pieces are also stored
        // separately below for audit purposes.
        const basic = breakdown.baseSalary;
        // Fixed allowances (HRA + other) are added as-is, not prorated —
        // see the schema comment on User.hraAmount for why. Overtime pay
        // (already attendance-derived, unlike these) is added on top.
        const fixedAllowances = (employee.hraAmount || 0) + (employee.otherAllowancesAmount || 0);
        const allow = Math.round((fixedAllowances + breakdown.overtime.totalOvertimePay) * 100) / 100;
        const statutoryDeductions = computeStatutoryDeductions({
          basicSalary: basic,
          grossSalary: basic + allow,
          policy: statutoryPolicyForBulk,
        });
        const deduct = Math.round((breakdown.suggestedDeduction + statutoryDeductions.totalStatutoryDeductions) * 100) / 100;
        const netSalary = basic + allow - deduct;

        const fileUrl = await buildAndSavePayslipPdf(req, employee, {
          month: monthNum,
          year: yearNum,
          basicSalary: basic,
          allowances: allow,
          deductions: deduct,
          netSalary,
          attendanceSummary: breakdown,
          statutoryDeductions,
          overtime: breakdown.overtime,
        });

        const payslip = await prisma.payslip.create({
          data: {
            userId: employee.id,
            month: monthNum,
            year: yearNum,
            basicSalary: basic,
            allowances: allow,
            deductions: deduct,
            netSalary,
            status: 'UNPAID',
            generatedById: req.user!.id,
            notes: 'Auto-generated via bulk payroll run.',
            fileUrl: fileUrl || null,
            attendanceSummary: breakdown as any,
            statutoryDeductions: statutoryDeductions as any,
            anomalies: breakdown.anomalies as any,
          },
        });

        generated.push({ employeeId: employee.id, payslipId: payslip.id, netSalary });

        if (breakdown.anomalies.length > 0) {
          flagged.push({ employeeId: employee.id, firstName: employee.firstName, lastName: employee.lastName, anomalies: breakdown.anomalies });
          AutomationService.trigger('ATTENDANCE_ANOMALY_DETECTED', {
            employeeId: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            managerId: employee.managerId,
            month: monthNum,
            year: yearNum,
            anomalies: breakdown.anomalies,
          }, anomalyIo).catch((err: any) => console.error('[Automation] ATTENDANCE_ANOMALY_DETECTED trigger failed:', err));
        }
      } catch (err: any) {
        failed.push({ employeeId: employee.id, error: err?.message || 'Unknown error' });
      }
    }

    emitHRUpdate(req, 'PAYSLIP');
    logAudit(
      req,
      'PAYSLIP_BULK_GENERATED',
      `Bulk-generated ${generated.length} payslip(s) for ${monthNum}/${yearNum} (${skippedExisting.length} skipped, ${failed.length} failed, ${flagged.length} flagged for attendance anomalies).`
    );

    res.status(201).json({ generated, skippedExisting, failed, flagged, totalTargeted: targetEmployees.length });
  } catch (error) {
    next(error);
  }
};

// Sensitive: an employee's stored base salary is treated the same way as
// their emergencyContact/birthday elsewhere (see user.controller.ts) —
// Admin-only to read or write, never included in the general directory or
// profile responses everyone else can see. Deliberately separate from the
// general user-update endpoint rather than folded into it, so this one
// narrow, audited, Admin-gated path is the only way this figure moves.
export const getEmployeeBaseSalary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can view compensation data.' });
      return;
    }

    const { id } = req.params;
    const employee = await prisma.user.findUnique({
      where: { id },
      select: { id: true, baseSalary: true, hraAmount: true, otherAllowancesAmount: true },
    });
    if (!employee) {
      res.status(404).json({ message: 'Employee not found.' });
      return;
    }

    res.status(200).json({
      baseSalary: employee.baseSalary,
      hraAmount: employee.hraAmount,
      otherAllowancesAmount: employee.otherAllowancesAmount,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeProbation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can view probation data.' });
      return;
    }

    const { id } = req.params;
    const employee = await prisma.user.findUnique({
      where: { id },
      select: { id: true, probationEndDate: true },
    });
    if (!employee) {
      res.status(404).json({ message: 'Employee not found.' });
      return;
    }

    res.status(200).json({ probationEndDate: employee.probationEndDate });
  } catch (error) {
    next(error);
  }
};

export const setEmployeeProbation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can update probation data.' });
      return;
    }

    const { id } = req.params;
    const { probationEndDate } = req.body;

    let parsedDate: Date | null = null;
    if (probationEndDate !== null && probationEndDate !== undefined && probationEndDate !== '') {
      parsedDate = new Date(probationEndDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ message: 'probationEndDate must be a valid date, or null to clear it.' });
        return;
      }
    }

    const employee = await prisma.user.findUnique({ where: { id } });
    if (!employee) {
      res.status(404).json({ message: 'Employee not found.' });
      return;
    }

    // Changing the date (including clearing it) restarts the reminder
    // window — an old "already reminded" flag from a since-changed date
    // shouldn't suppress a reminder for the new one.
    const updated = await prisma.user.update({
      where: { id },
      data: { probationEndDate: parsedDate, probationReminderSentAt: null },
      select: { id: true, probationEndDate: true },
    });

    logAudit(req, 'PROBATION_END_DATE_UPDATED', `Set probation end date for user ${id} to ${parsedDate ? parsedDate.toDateString() : 'none'}.`);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// Active employees currently on probation (end date in the future),
// soonest-ending first — the "who's on probation" view a reminder-email-only
// approach doesn't give an Admin/Manager, since a scan of individual
// profiles is otherwise the only way to see this. Scoped the same way
// every other HR "list people" read is (see getVisibleUserIds).
export const getEmployeesOnProbation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const visibleUserIds = await getVisibleUserIds(req.user!.id, req.user!.role);
    const employees = await prisma.user.findMany({
      where: {
        isActive: true,
        probationEndDate: { gte: new Date() },
        ...(visibleUserIds ? { id: { in: visibleUserIds } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true, probationEndDate: true, managerId: true },
      orderBy: { probationEndDate: 'asc' },
    });
    res.status(200).json(employees);
  } catch (error) {
    next(error);
  }
};

export const setEmployeeBaseSalary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can update compensation data.' });
      return;
    }

    const { id } = req.params;
    const { baseSalary, hraAmount, otherAllowancesAmount } = req.body;

    // Same non-negative-or-null check applied uniformly to all three —
    // baseSalary here continues to mean "basic", exactly as it always
    // has; hraAmount/otherAllowancesAmount are optional components on
    // top, not a replacement for it.
    const validateAmount = (value: any, fieldName: string): string | null => {
      if (value === undefined) return null; // not being changed
      if (value !== null && (typeof value !== 'number' || Number.isNaN(value) || value < 0)) {
        return `${fieldName} must be a non-negative number, or null to clear it.`;
      }
      return null;
    };

    for (const [value, fieldName] of [
      [baseSalary, 'baseSalary'],
      [hraAmount, 'hraAmount'],
      [otherAllowancesAmount, 'otherAllowancesAmount'],
    ] as const) {
      const error = validateAmount(value, fieldName);
      if (error) {
        res.status(400).json({ message: error });
        return;
      }
    }

    const employee = await prisma.user.findUnique({ where: { id } });
    if (!employee) {
      res.status(404).json({ message: 'Employee not found.' });
      return;
    }

    const data: any = {};
    if (baseSalary !== undefined) data.baseSalary = baseSalary;
    if (hraAmount !== undefined) data.hraAmount = hraAmount;
    if (otherAllowancesAmount !== undefined) data.otherAllowancesAmount = otherAllowancesAmount;

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, baseSalary: true, hraAmount: true, otherAllowancesAmount: true },
    });

    logAudit(req, 'BASE_SALARY_UPDATED', `Updated compensation for user ${id}: basic=${updated.baseSalary ?? 'null'}, hra=${updated.hraAmount ?? 'null'}, other=${updated.otherAllowancesAmount ?? 'null'}.`);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const updatePayslipStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can update payslip status.' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'PAID' && status !== 'UNPAID' && status !== 'DRAFT') {
      res.status(400).json({ message: 'Invalid payslip status.' });
      return;
    }

    const updated = await prisma.payslip.update({
      where: { id },
      data: { status },
    });

    emitHRUpdate(req, 'PAYSLIP');
    logAudit(req, 'PAYSLIP_STATUS_UPDATED', `Set payslip ${id} (user ${updated.userId}) status to ${status}.`);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SHIFT MANAGEMENT
// ==========================================

export const getShifts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shifts = await prisma.shift.findMany({
      orderBy: { name: 'asc' },
    });
    res.status(200).json(shifts);
  } catch (error) {
    next(error);
  }
};

export const createShift = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isManagerOrAdmin(req.user?.role!)) {
      res.status(403).json({ message: 'Forbidden. Only managers and admins can define shifts.' });
      return;
    }

    const { name, startTime, endTime, color, description } = req.body;
    if (!name || !startTime || !endTime) {
      res.status(400).json({ message: 'Name, startTime, and endTime are required.' });
      return;
    }

    const shift = await prisma.shift.create({
      data: { name, startTime, endTime, color, description },
    });

    emitHRUpdate(req, 'SHIFT');
    res.status(201).json(shift);
  } catch (error) {
    next(error);
  }
};

export const getShiftAssignments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignments = await prisma.shiftAssignment.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, designation: true } },
        shift: true,
      },
      orderBy: { startDate: 'asc' },
    });

    res.status(200).json(assignments);
  } catch (error) {
    next(error);
  }
};

export const assignShift = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isManagerOrAdmin(req.user?.role!)) {
      res.status(403).json({ message: 'Forbidden. Only managers and admins can assign shifts.' });
      return;
    }

    const { employeeId, shiftId, startDate, endDate } = req.body;
    if (!employeeId || !shiftId || !startDate || !endDate) {
      res.status(400).json({ message: 'employeeId, shiftId, startDate, and endDate are required.' });
      return;
    }

    const assignment = await prisma.shiftAssignment.create({
      data: {
        userId: employeeId,
        shiftId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        shift: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    emitHRUpdate(req, 'SHIFT');
    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
};

export const createSwapRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { requesterAssignmentId, assigneeId, assigneeAssignmentId } = req.body;

    if (!requesterAssignmentId || !assigneeId || !assigneeAssignmentId) {
      res.status(400).json({ message: 'requesterAssignmentId, assigneeId, and assigneeAssignmentId are required.' });
      return;
    }

    if (assigneeId === userId) {
      res.status(400).json({ message: 'You cannot request a shift swap with yourself.' });
      return;
    }

    const [requesterAssignment, assigneeAssignment] = await Promise.all([
      prisma.shiftAssignment.findUnique({ where: { id: requesterAssignmentId } }),
      prisma.shiftAssignment.findUnique({ where: { id: assigneeAssignmentId } }),
    ]);

    if (!requesterAssignment || !assigneeAssignment) {
      res.status(404).json({ message: 'One or both shift assignments could not be found.' });
      return;
    }

    // The client is trusted to only ever offer the user's own assignments and the
    // chosen teammate's assignments in its dropdowns, but that's a UI convenience,
    // not enforcement — verify it server-side so a request can't be built to swap
    // shifts that don't actually belong to the stated requester/assignee.
    if (requesterAssignment.userId !== userId) {
      res.status(403).json({ message: 'You can only offer your own shift assignment in a swap request.' });
      return;
    }
    if (assigneeAssignment.userId !== assigneeId) {
      res.status(400).json({ message: "The selected shift assignment does not belong to the chosen teammate." });
      return;
    }

    const swap = await prisma.shiftSwapRequest.create({
      data: {
        requesterId: userId,
        assigneeId,
        requesterAssignmentId,
        assigneeAssignmentId,
        status: 'PENDING',
      },
    });

    emitHRUpdate(req, 'SHIFT');
    res.status(201).json(swap);
  } catch (error) {
    next(error);
  }
};

export const getSwapRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user?.role!;
    const visibleUserIds = await getVisibleUserIds(req.user?.id!, role);
    let swaps;

    if (!visibleUserIds) {
      swaps = await prisma.shiftSwapRequest.findMany({
        include: {
          requester: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          requesterAssignment: { include: { shift: true } },
          assigneeAssignment: { include: { shift: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // A Manager sees swap requests involving themselves, their direct
      // reports, or where a direct report is on either side of the swap —
      // not every swap request in the company.
      swaps = await prisma.shiftSwapRequest.findMany({
        where: {
          OR: [
            { requesterId: { in: visibleUserIds } },
            { assigneeId: { in: visibleUserIds } },
          ],
        },
        include: {
          requester: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          requesterAssignment: { include: { shift: true } },
          assigneeAssignment: { include: { shift: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.status(200).json(swaps);
  } catch (error) {
    next(error);
  }
};

export const updateSwapRequestStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      res.status(400).json({ message: 'Status must be APPROVED or REJECTED.' });
      return;
    }

    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: {
        requesterAssignment: true,
        assigneeAssignment: true,
      },
    });

    if (!swap) {
      res.status(404).json({ message: 'Swap request not found.' });
      return;
    }

    if (swap.status !== 'PENDING') {
      res.status(400).json({ message: 'Swap request already processed.' });
      return;
    }

    // Swapping requires Manager approval
    if (!isManagerOrAdmin(req.user?.role!)) {
      res.status(403).json({ message: 'Only managers and admins can approve shift swaps.' });
      return;
    }

    if (swap.requesterId === req.user?.id || swap.assigneeId === req.user?.id) {
      res.status(403).json({ message: 'You cannot approve a shift swap you are personally part of. Ask another manager or admin to review it.' });
      return;
    }

    // A swap touches two employees, so either one being a direct report of the
    // approving manager is enough authority to sign off on it. Admins can always approve.
    const canApproveSwap =
      (await isAuthorizedApprover(req.user!.id, req.user?.role!, swap.requesterId)) ||
      (await isAuthorizedApprover(req.user!.id, req.user?.role!, swap.assigneeId));

    if (!canApproveSwap) {
      res.status(403).json({ message: 'Forbidden. Only the reporting manager of one of these employees, or an admin, can approve this shift swap.' });
      return;
    }

    if (status === 'APPROVED') {
      const requesterShiftId = swap.requesterAssignment.shiftId;
      const assigneeShiftId = swap.assigneeAssignment.shiftId;

      await prisma.$transaction([
        prisma.shiftAssignment.update({
          where: { id: swap.requesterAssignmentId },
          data: { shiftId: assigneeShiftId },
        }),
        prisma.shiftAssignment.update({
          where: { id: swap.assigneeAssignmentId },
          data: { shiftId: requesterShiftId },
        }),
        prisma.shiftSwapRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedById: req.user?.id!,
          },
        }),
      ]);
    } else {
      await prisma.shiftSwapRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: req.user?.id!,
        },
      });
    }

    emitHRUpdate(req, 'SHIFT');
    logAudit(req, 'SHIFT_SWAP_' + status, `${status === 'APPROVED' ? 'Approved' : 'Rejected'} shift swap ${id} between user ${swap.requesterId} and user ${swap.assigneeId}.`);
    res.status(200).json({ message: `Shift swap ${status.toLowerCase()} successfully.` });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYEE RECOGNITION BOARD
// ==========================================

export const getRecognitions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recognitions = await prisma.recognition.findMany({
      where: {
        NOT: [
          { message: { contains: 'Happy Birthday' } },
          { message: { contains: 'Work Anniversary' } },
        ]
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(recognitions);
  } catch (error) {
    next(error);
  }
};

export const getMyWishes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const today = new Date();

    const wishes = await prisma.recognition.findMany({
      where: {
        receiverId: userId,
        OR: [
          { message: { contains: 'Happy Birthday' } },
          { message: { contains: 'Work Anniversary' } }
        ]
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } }
      }
    });

    const activeWishes: any[] = [];
    const expiredWishIds: string[] = [];

    wishes.forEach(w => {
      const wDate = new Date(w.createdAt);
      const isSameDay = wDate.getDate() === today.getDate() &&
                        wDate.getMonth() === today.getMonth() &&
                        wDate.getFullYear() === today.getFullYear();
      if (isSameDay) {
        activeWishes.push(w);
      } else {
        expiredWishIds.push(w.id);
      }
    });

    if (expiredWishIds.length > 0) {
      await prisma.recognition.deleteMany({
        where: { id: { in: expiredWishIds } }
      });
    }

    res.status(200).json(activeWishes);
  } catch (error) {
    next(error);
  }
};

// Returns ALL birthday/work-anniversary wishes created today, across the whole org
// (not scoped to the requesting user). Used to:
//  - determine whether the current user has already sent a wish to a given teammate today
//  - show the wishes a teammate has already received alongside the "send wish" action
export const getCelebrationWishes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const wishes = await prisma.recognition.findMany({
      where: {
        OR: [
          { message: { contains: 'Happy Birthday' } },
          { message: { contains: 'Work Anniversary' } }
        ]
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const today = new Date();
    const activeWishes = wishes.filter(w => {
      const wDate = new Date(w.createdAt);
      return wDate.getDate() === today.getDate() &&
             wDate.getMonth() === today.getMonth() &&
             wDate.getFullYear() === today.getFullYear();
    });

    res.status(200).json(activeWishes);
  } catch (error) {
    next(error);
  }
};

export const createRecognition = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const senderId = req.user?.id!;
    const { receiverId, badge, message } = req.body;

    if (!receiverId || !badge || !message) {
      res.status(400).json({ message: 'receiverId, badge, and message are required.' });
      return;
    }

    if (senderId === receiverId) {
      res.status(400).json({ message: 'You cannot recognize yourself!' });
      return;
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      res.status(404).json({ message: 'Receiver user not found.' });
      return;
    }

    const recognition = await prisma.recognition.create({
      data: {
        senderId,
        receiverId,
        badge,
        message,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    emitHRUpdate(req, 'RECOGNITION');
    res.status(201).json(recognition);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN ONLY FULL CONTROL CRUD
// ==========================================

export const deleteLeaveRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });

    if (!leave) {
      res.status(404).json({ message: 'Leave request not found.' });
      return;
    }

    const isAdmin = req.user?.role === 'ADMIN';
    const isOwner = leave.userId === req.user?.id;

    // Admins can delete any leave request. Employees/managers can only cancel their
    // own request, and only while it hasn't been decided on yet.
    if (!isAdmin) {
      if (!isOwner) {
        res.status(403).json({ message: 'You can only cancel your own leave requests.' });
        return;
      }
      if (leave.status !== 'PENDING') {
        res.status(400).json({ message: 'This request has already been processed and can no longer be cancelled. Contact an admin if you need it removed.' });
        return;
      }
    }

    // Approving a leave deducts its day count from the employee's balance
    // (see updateLeaveStatus above). Deleting an approved request — which
    // only an admin can do, e.g. correcting a mistaken approval or removing
    // a record for leave the employee ultimately didn't take — needs to
    // give those days back, or the employee is left permanently short by
    // however many days this request used, with nothing in the UI to
    // reveal why their balance looks wrong.
    if (leave.status === 'APPROVED') {
      const diffTime = Math.abs(leave.endDate.getTime() - leave.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const year = leave.startDate.getFullYear();

      const balance = await prisma.leaveBalance.findUnique({
        where: { userId_leaveType_year: { userId: leave.userId, leaveType: leave.leaveType, year } },
      });
      if (balance) {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { used: Math.max(0, balance.used - diffDays) },
        });
      }
    }

    await prisma.leaveRequest.delete({ where: { id } });
    emitHRUpdate(req, 'LEAVE');
    logAudit(req, 'LEAVE_REQUEST_DELETED', `Deleted leave request ${id} (owner: ${leave.userId}, was ${leave.status}).`);
    res.status(200).json({ message: 'Leave request deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const updateLeaveBalance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can modify leave balances.' });
      return;
    }
    const { id } = req.params;
    const { total, used } = req.body;
    const updated = await prisma.leaveBalance.update({
      where: { id },
      data: {
        total: total !== undefined ? parseFloat(total) : undefined,
        used: used !== undefined ? parseFloat(used) : undefined,
      }
    });
    emitHRUpdate(req, 'LEAVE');
    logAudit(req, 'LEAVE_BALANCE_ADJUSTED', `Adjusted leave balance ${id}: total=${total ?? 'unchanged'}, used=${used ?? 'unchanged'}.`);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// On-demand version of the daily background job (index.ts's
// 'leave-accrual' interval) — lets an Admin trigger a recalculation
// immediately (e.g. right after changing the accrual policy) instead of
// waiting for the next scheduled run. Safe to call anytime: the underlying
// engine only ever raises a balance's total, never lowers it.
export const runLeaveAccrual = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can run leave accrual.' });
      return;
    }

    const result = await runLeaveAccrualForAllActiveEmployees();
    emitHRUpdate(req, 'LEAVE');
    logAudit(
      req,
      'LEAVE_ACCRUAL_RUN',
      `Manually ran leave accrual: ${result.employeesProcessed} employee(s) processed, ${result.balancesUpdated} balance(s) updated.`
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateAttendanceLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can adjust attendance logs.' });
      return;
    }
    const { id } = req.params;
    const { clockIn, clockOut, status, notes } = req.body;
    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        clockIn: clockIn ? new Date(clockIn) : undefined,
        clockOut: clockOut ? new Date(clockOut) : undefined,
        status,
        notes,
      }
    });
    emitHRUpdate(req, 'ATTENDANCE');
    logAudit(req, 'ATTENDANCE_LOG_ADJUSTED', `Manually adjusted attendance log ${id} (clockIn/clockOut/status/notes).`);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteAttendanceLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can delete attendance logs.' });
      return;
    }
    const { id } = req.params;
    await prisma.attendance.delete({ where: { id } });
    emitHRUpdate(req, 'ATTENDANCE');
    logAudit(req, 'ATTENDANCE_LOG_DELETED', `Deleted attendance log ${id}.`);
    res.status(200).json({ message: 'Attendance log deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteExpenseClaim = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const claim = await prisma.expenseClaim.findUnique({ where: { id } });

    if (!claim) {
      res.status(404).json({ message: 'Expense claim not found.' });
      return;
    }

    const isAdmin = req.user?.role === 'ADMIN';
    const isOwner = claim.userId === req.user?.id;

    // Admins can delete any expense claim. Employees/managers can only withdraw
    // their own claim, and only while it hasn't been decided on yet.
    if (!isAdmin) {
      if (!isOwner) {
        res.status(403).json({ message: 'You can only withdraw your own expense claims.' });
        return;
      }
      if (claim.status !== 'PENDING') {
        res.status(400).json({ message: 'This claim has already been processed and can no longer be withdrawn. Contact an admin if you need it removed.' });
        return;
      }
    }

    await prisma.expenseClaim.delete({ where: { id } });
    emitHRUpdate(req, 'EXPENSE');
    logAudit(req, 'EXPENSE_CLAIM_DELETED', `Deleted expense claim ${id} (owner: ${claim.userId}, amount: ${claim.amount}, was ${claim.status}).`);
    res.status(200).json({ message: 'Expense claim deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deletePayslip = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can delete payslips.' });
      return;
    }
    const { id } = req.params;
    const deletedPayslip = await prisma.payslip.delete({ where: { id } });
    emitHRUpdate(req, 'PAYSLIP');
    logAudit(req, 'PAYSLIP_DELETED', `Deleted payslip ${id} (user: ${deletedPayslip.userId}, ${deletedPayslip.month}/${deletedPayslip.year}, net: ${deletedPayslip.netSalary}).`);
    res.status(200).json({ message: 'Payslip deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteShiftAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can delete shift assignments.' });
      return;
    }
    const { id } = req.params;
    await prisma.shiftAssignment.delete({ where: { id } });
    emitHRUpdate(req, 'SHIFT');
    logAudit(req, 'SHIFT_ASSIGNMENT_DELETED', `Deleted shift assignment ${id}.`);
    res.status(200).json({ message: 'Shift assignment deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can delete shifts.' });
      return;
    }
    const { id } = req.params;
    await prisma.shift.delete({ where: { id } });
    emitHRUpdate(req, 'SHIFT');
    logAudit(req, 'SHIFT_TYPE_DELETED', `Deleted shift type ${id}.`);
    res.status(200).json({ message: 'Shift type deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteRecognition = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can delete recognitions.' });
      return;
    }
    const { id } = req.params;
    await prisma.recognition.delete({ where: { id } });
    emitHRUpdate(req, 'RECOGNITION');
    res.status(200).json({ message: 'Recognition deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getCelebrations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentMonth = new Date().getMonth() + 1; // 1-indexed (Jan = 1, Dec = 12)
    
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
        avatarUrl: true,
        birthday: true,
        createdAt: true
      }
    });

    const birthdays = allUsers.filter(u => {
      if (!u.birthday) return false;
      return (new Date(u.birthday).getMonth() + 1) === currentMonth;
    }).map(u => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      designation: u.designation,
      avatarUrl: u.avatarUrl,
      date: u.birthday
    }));

    const anniversaries = allUsers.filter(u => {
      return (new Date(u.createdAt).getMonth() + 1) === currentMonth;
    }).map(u => {
      const years = new Date().getFullYear() - new Date(u.createdAt).getFullYear();
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        designation: u.designation,
        avatarUrl: u.avatarUrl,
        date: u.createdAt,
        years: years > 0 ? years : 1
      };
    });

    res.status(200).json({ birthdays, anniversaries });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ATTENDANCE REGULARIZATION
// ==========================================
// Employee-initiated correction requests — see
// services/regularization.service.ts for the validation rules and
// prisma/schema.prisma's AttendanceRegularization model for why
// attendanceId is nullable (no existing log at all vs. a wrong one).

export const requestRegularization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { date, requestedClockIn, requestedClockOut, reason } = req.body;

    if (!date) {
      res.status(400).json({ message: 'date is required.' });
      return;
    }
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      res.status(400).json({ message: 'date must be a valid date.' });
      return;
    }
    // Normalize to the start of the day, matching how Attendance.date is
    // stored elsewhere (see clockIn) — otherwise a time-of-day mismatch
    // would make the lookup below (and the future duplicate-PENDING check)
    // silently miss the actual row for that day.
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const existingAttendance = await prisma.attendance.findFirst({
      where: { userId, date: { gte: dayStart, lte: dayEnd } },
    });

    const validation = validateRegularizationRequest(req.body, !!existingAttendance);
    if (!validation.valid) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const existingPending = await prisma.attendanceRegularization.findFirst({
      where: { userId, date: { gte: dayStart, lte: dayEnd }, status: 'PENDING' },
    });
    if (existingPending) {
      res.status(400).json({ message: 'You already have a pending regularization request for this date.' });
      return;
    }

    const request = await prisma.attendanceRegularization.create({
      data: {
        userId,
        date: dayStart,
        attendanceId: existingAttendance?.id || null,
        requestedClockIn: validation.data.requestedClockIn,
        requestedClockOut: validation.data.requestedClockOut,
        reason: validation.data.reason,
      },
    });

    // Same trigger/action engine as LEAVE_REQUESTED — an Admin can wire up
    // NOTIFY_MANAGER (or any other configured action) to this the same way,
    // rather than a hardcoded notification only this feature gets.
    const { AutomationService } = require('../services/automation.service');
    const automationIo = req.app.get('io');
    AutomationService.trigger('REGULARIZATION_REQUESTED', {
      requesterId: userId,
      regularizationDate: dayStart.toISOString(),
    }, automationIo).catch((err: any) => console.error('[Automation] REGULARIZATION_REQUESTED trigger failed:', err));

    emitHRUpdate(req, 'ATTENDANCE');
    logAudit(req, 'REGULARIZATION_REQUESTED', `Requested attendance regularization for ${dayStart.toDateString()}.`);
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

export const getMyRegularizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requests = await prisma.attendanceRegularization.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

// Scoped the same way every other HR "list everything I can approve" read
// is (see getVisibleUserIds) — Admins see the whole org, Managers see
// themselves + direct reports only.
export const getRegularizationsToReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const visibleUserIds = await getVisibleUserIds(req.user!.id, req.user!.role);
    const requests = await prisma.attendanceRegularization.findMany({
      where: visibleUserIds ? { userId: { in: visibleUserIds } } : {},
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

export const updateRegularizationStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, managerNotes } = req.body;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      res.status(400).json({ message: "status must be 'APPROVED' or 'REJECTED'." });
      return;
    }

    const request = await prisma.attendanceRegularization.findUnique({ where: { id } });
    if (!request) {
      res.status(404).json({ message: 'Regularization request not found.' });
      return;
    }
    if (request.status !== 'PENDING') {
      res.status(400).json({ message: `This request has already been ${request.status.toLowerCase()}.` });
      return;
    }
    if (!(await isAuthorizedApprover(req.user!.id, req.user!.role, request.userId))) {
      res.status(403).json({ message: 'You are not authorized to decide on this request.' });
      return;
    }

    if (status === 'APPROVED') {
      // Recompute status through the same automated engine clockIn/clockOut
      // use — a regularized day still gets real Late/Half-Day detection,
      // it isn't a manual bypass of that logic.
      const settings = await getOrganizationSettings();
      const expectedStart = await getExpectedShiftStart(request.userId, request.date);

      const finalClockIn = request.requestedClockIn
        || (request.attendanceId ? (await prisma.attendance.findUnique({ where: { id: request.attendanceId } }))?.clockIn : null);
      const finalClockOut = request.requestedClockOut
        || (request.attendanceId ? (await prisma.attendance.findUnique({ where: { id: request.attendanceId } }))?.clockOut : null);

      if (!finalClockIn) {
        res.status(400).json({ message: 'Cannot approve: no clock-in time is available (existing or requested).' });
        return;
      }

      const entryStatus = determineClockInStatus(finalClockIn, expectedStart, settings.lateGraceMinutes);
      const finalStatus = finalClockOut
        ? determineFinalAttendanceStatus(entryStatus, computeWorkedMinutes(finalClockIn, finalClockOut, []), settings.halfDayThresholdHours)
        : entryStatus;

      if (request.attendanceId) {
        await prisma.attendance.update({
          where: { id: request.attendanceId },
          data: {
            clockIn: finalClockIn,
            clockOut: finalClockOut || undefined,
            status: finalStatus,
            notes: request.reason ? `Regularized: ${request.reason}` : undefined,
          },
        });
      } else {
        await prisma.attendance.create({
          data: {
            userId: request.userId,
            date: request.date,
            clockIn: finalClockIn,
            clockOut: finalClockOut || null,
            status: finalStatus,
            notes: `Regularized: ${request.reason}`,
          },
        });
      }
    }

    const updated = await prisma.attendanceRegularization.update({
      where: { id },
      data: { status, managerNotes: managerNotes || null, approvedById: req.user!.id },
    });

    emitHRUpdate(req, 'ATTENDANCE');
    logAudit(req, 'REGULARIZATION_DECIDED', `${status === 'APPROVED' ? 'Approved' : 'Rejected'} attendance regularization ${id}.`);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PAYROLL RECONCILIATION REPORT
// ==========================================
// See services/reconciliation.service.ts for the flag logic itself — this
// is just the DB-fetching wrapper that gathers, per active employee, the
// same attendance/leave breakdown payroll generation already computes,
// plus pending-request counts and whether a payslip already exists, and
// hands it to buildReconciliationFlags.
export const getPayrollReconciliationReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can view the reconciliation report.' });
      return;
    }

    const { month, year } = req.query;
    if (!month || !year) {
      res.status(400).json({ message: 'month and year query parameters are required.' });
      return;
    }
    const monthNum = parseInt(month as string);
    const yearNum = parseInt(year as string);
    const { start, end } = getMonthDateRange(monthNum, yearNum);

    const employees = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true },
    });

    const rows: Array<{ employeeId: string; firstName: string; lastName: string; avatarUrl: string | null; designation: string | null; flags: ReturnType<typeof buildReconciliationFlags> }> = [];

    for (const employee of employees) {
      const breakdown = await getPayrollBreakdownForEmployee(employee.id, monthNum, yearNum);

      const [pendingLeaveCount, pendingRegularizationCount, existingPayslip] = await Promise.all([
        prisma.leaveRequest.count({
          where: { userId: employee.id, status: 'PENDING', startDate: { lte: end }, endDate: { gte: start } },
        }),
        prisma.attendanceRegularization.count({
          where: { userId: employee.id, status: 'PENDING', date: { gte: start, lte: end } },
        }),
        prisma.payslip.findFirst({ where: { userId: employee.id, month: monthNum, year: yearNum } }),
      ]);

      const flags = buildReconciliationFlags({
        absentDays: breakdown.absentDays,
        unpaidLeaveDays: breakdown.unpaidLeaveDays,
        workingDays: breakdown.workingDays,
        presentDays: breakdown.presentDays,
        anomalyCount: breakdown.anomalies.length,
        pendingLeaveCount,
        pendingRegularizationCount,
        payslipAlreadyExists: !!existingPayslip,
      });

      if (flags.length > 0) {
        rows.push({
          employeeId: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          avatarUrl: employee.avatarUrl,
          designation: employee.designation,
          flags,
        });
      }
    }

    res.status(200).json({
      month: monthNum,
      year: yearNum,
      totalEmployees: employees.length,
      employeesWithFlags: rows.length,
      rows,
    });
  } catch (error) {
    next(error);
  }
};

