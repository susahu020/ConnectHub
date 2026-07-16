import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Helper to check if role is Admin or Manager
const isManagerOrAdmin = (role: string) => role === 'ADMIN' || role === 'MANAGER';

// Real-time update helper via Socket.io
const emitHRUpdate = (req: any, type: string) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('hr_update', { type });
  }
};

// ==========================================
// LEAVE MANAGEMENT
// ==========================================

export const getLeaves = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user?.role!;
    let leaves;

    if (isManagerOrAdmin(role)) {
      leaves = await prisma.leaveRequest.findMany({
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, designation: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      leaves = await prisma.leaveRequest.findMany({
        where: { userId: req.user?.id! },
        include: {
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.status(200).json(leaves);
  } catch (error) {
    next(error);
  }
};

export const requestLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { leaveType, startDate, endDate, reason } = req.body;

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

    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveType,
        startDate: start,
        endDate: end,
        reason,
        status: 'PENDING',
      },
    });

    emitHRUpdate(req, 'LEAVE');
    res.status(201).json(leave);
  } catch (error) {
    next(error);
  }
};

export const getLeaveBalances = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const year = new Date().getFullYear();

    const defaultTypes = [
      { leaveType: 'ANNUAL', total: 12 },
      { leaveType: 'SICK', total: 8 },
      { leaveType: 'CASUAL', total: 6 },
      { leaveType: 'UNPAID', total: 30 },
    ];

    let balances = await prisma.leaveBalance.findMany({
      where: { userId, year },
    });

    if (balances.length === 0) {
      await prisma.leaveBalance.createMany({
        data: defaultTypes.map((t) => ({
          userId,
          year,
          leaveType: t.leaveType,
          total: t.total,
          used: 0,
        })),
      });

      balances = await prisma.leaveBalance.findMany({
        where: { userId, year },
      });
    }

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

    if (status === 'APPROVED') {
      // Calculate leave days
      const diffTime = Math.abs(leaveRequest.endDate.getTime() - leaveRequest.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

    const { location, notes } = req.body;

    const log = await prisma.attendance.create({
      data: {
        userId,
        date: today,
        clockIn: new Date(),
        status: 'PRESENT',
        ipAddress: req.ip || null,
        location: location || null,
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
    });

    if (!attendance) {
      res.status(400).json({ message: 'No active clock-in session found for today.' });
      return;
    }

    const { notes } = req.body;

    // Check if there is an open break, end it
    const openBreak = await prisma.attendanceBreak.findFirst({
      where: { attendanceId: attendance.id, endTime: null },
    });

    if (openBreak) {
      await prisma.attendanceBreak.update({
        where: { id: openBreak.id },
        data: { endTime: new Date() },
      });
    }

    const log = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: new Date(),
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
    let logs;

    if (all === 'true' && isManagerOrAdmin(role)) {
      logs = await prisma.attendance.findMany({
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, designation: true } },
          breaks: true,
        },
        orderBy: { date: 'desc' },
      });
    } else {
      const targetUserId = (isManagerOrAdmin(role) && queryUserId) ? String(queryUserId) : req.user?.id!;
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
    let claims;

    if (isManagerOrAdmin(role)) {
      claims = await prisma.expenseClaim.findMany({
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, designation: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      claims = await prisma.expenseClaim.findMany({
        where: { userId: req.user?.id! },
        include: {
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

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

    const updatedClaim = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status,
        approvedById: req.user?.id!,
        managerNotes: managerNotes || null,
      },
    });

    emitHRUpdate(req, 'EXPENSE');
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

    if (isManagerOrAdmin(role)) {
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
    if (!isManagerOrAdmin(req.user?.role!)) {
      res.status(403).json({ message: 'Forbidden. Only managers and admins can generate payslips.' });
      return;
    }

    const { employeeId, month, year, basicSalary, allowances, deductions, notes, fileUrl } = req.body;

    if (!employeeId || month === undefined || year === undefined || basicSalary === undefined) {
      res.status(400).json({ message: 'employeeId, month, year, and basicSalary are required.' });
      return;
    }

    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ message: 'Employee user not found.' });
      return;
    }

    const basic = parseFloat(basicSalary);
    const allow = allowances ? parseFloat(allowances) : 0;
    const deduct = deductions ? parseFloat(deductions) : 0;
    const netSalary = basic + allow - deduct;

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
        fileUrl: fileUrl || null,
      },
    });

    emitHRUpdate(req, 'PAYSLIP');
    res.status(201).json(payslip);
  } catch (error) {
    next(error);
  }
};

export const updatePayslipStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isManagerOrAdmin(req.user?.role!)) {
      res.status(403).json({ message: 'Forbidden. Only managers and admins can update payslip status.' });
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
    const role = req.user?.role!;
    let assignments;

    if (isManagerOrAdmin(role)) {
      assignments = await prisma.shiftAssignment.findMany({
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, designation: true } },
          shift: true,
        },
        orderBy: { startDate: 'asc' },
      });
    } else {
      assignments = await prisma.shiftAssignment.findMany({
        where: { userId: req.user?.id! },
        include: { shift: true },
        orderBy: { startDate: 'asc' },
      });
    }

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
    let swaps;

    if (isManagerOrAdmin(role)) {
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
      swaps = await prisma.shiftSwapRequest.findMany({
        where: {
          OR: [
            { requesterId: req.user?.id! },
            { assigneeId: req.user?.id! },
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
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can delete leave requests.' });
      return;
    }
    const { id } = req.params;
    await prisma.leaveRequest.delete({ where: { id } });
    emitHRUpdate(req, 'LEAVE');
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
    res.status(200).json(updated);
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
    res.status(200).json({ message: 'Attendance log deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteExpenseClaim = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Only Admins can delete expense claims.' });
      return;
    }
    const { id } = req.params;
    await prisma.expenseClaim.delete({ where: { id } });
    emitHRUpdate(req, 'EXPENSE');
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
    await prisma.payslip.delete({ where: { id } });
    emitHRUpdate(req, 'PAYSLIP');
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
