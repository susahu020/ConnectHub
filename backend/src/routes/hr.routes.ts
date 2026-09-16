import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import {
  getLeaves,
  requestLeave,
  getLeaveBalances,
  updateLeaveStatus,
  getTodayStatus,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getAttendanceLogs,
  getHolidays,
  createHoliday,
  deleteHoliday,
  getExpenseClaims,
  createExpenseClaim,
  updateExpenseStatus,
  getPayslips,
  generatePayslip,
  previewPayrollCalculation,
  bulkGeneratePayslips,
  updatePayslipStatus,
  getPayrollReconciliationReport,
  getEmployeeBaseSalary,
  setEmployeeBaseSalary,
  getEmployeeProbation,
  setEmployeeProbation,
  getEmployeesOnProbation,
  getShifts,
  createShift,
  getShiftAssignments,
  assignShift,
  createSwapRequest,
  getSwapRequests,
  updateSwapRequestStatus,
  getRecognitions,
  getMyWishes,
  getCelebrationWishes,
  createRecognition,
  deleteLeaveRequest,
  updateLeaveBalance,
  runLeaveAccrual,
  updateAttendanceLog,
  deleteAttendanceLog,
  requestRegularization,
  getMyRegularizations,
  getRegularizationsToReview,
  updateRegularizationStatus,
  deleteExpenseClaim,
  deletePayslip,
  deleteShiftAssignment,
  deleteShift,
  deleteRecognition,
  getCelebrations,
} from '../controllers/hr.controller';

const router = Router();

// ==========================================
// HR MODULE ROUTES
// ==========================================
// Leaves
router.get('/hr/leaves', authenticate as any, getLeaves as any);
router.post('/hr/leaves', authenticate as any, requestLeave as any);
router.get('/hr/leaves/balances', authenticate as any, getLeaveBalances as any);
router.put('/hr/leaves/:id/status', authenticate as any, authorize(['ADMIN', 'MANAGER']), updateLeaveStatus as any);
router.delete('/hr/leaves/:id', authenticate as any, deleteLeaveRequest as any);
router.put('/hr/leaves/balances/:id', authenticate as any, authorize(['ADMIN']), updateLeaveBalance as any);
router.post('/hr/leaves/balances/accrue', authenticate as any, authorize(['ADMIN']), runLeaveAccrual as any);

// Attendance
router.get('/hr/attendance/today', authenticate as any, getTodayStatus as any);
router.post('/hr/attendance/clock-in', authenticate as any, clockIn as any);
router.post('/hr/attendance/clock-out', authenticate as any, clockOut as any);
router.post('/hr/attendance/break-start', authenticate as any, startBreak as any);
router.post('/hr/attendance/break-end', authenticate as any, endBreak as any);
router.get('/hr/attendance/logs', authenticate as any, getAttendanceLogs as any);
router.put('/hr/attendance/logs/:id', authenticate as any, authorize(['ADMIN']), updateAttendanceLog as any);
router.delete('/hr/attendance/logs/:id', authenticate as any, authorize(['ADMIN']), deleteAttendanceLog as any);
router.post('/hr/attendance/regularizations', authenticate as any, requestRegularization as any);
router.get('/hr/attendance/regularizations/mine', authenticate as any, getMyRegularizations as any);
router.get('/hr/attendance/regularizations', authenticate as any, authorize(['ADMIN', 'MANAGER']), getRegularizationsToReview as any);
router.put('/hr/attendance/regularizations/:id/status', authenticate as any, authorize(['ADMIN', 'MANAGER']), updateRegularizationStatus as any);

// Holidays
router.get('/hr/holidays', authenticate as any, getHolidays as any);
router.post('/hr/holidays', authenticate as any, authorize(['ADMIN', 'MANAGER']), createHoliday as any);
router.delete('/hr/holidays/:id', authenticate as any, authorize(['ADMIN', 'MANAGER']), deleteHoliday as any);

// Expense Claims
router.get('/hr/expenses', authenticate as any, getExpenseClaims as any);
router.post('/hr/expenses', authenticate as any, createExpenseClaim as any);
router.put('/hr/expenses/:id/status', authenticate as any, authorize(['ADMIN', 'MANAGER']), updateExpenseStatus as any);
router.delete('/hr/expenses/:id', authenticate as any, deleteExpenseClaim as any);

// Payslips
router.get('/hr/payslips', authenticate as any, getPayslips as any);
router.get('/hr/payslips/calculate/:employeeId', authenticate as any, authorize(['ADMIN']), previewPayrollCalculation as any);
router.post('/hr/payslips/bulk-generate', authenticate as any, authorize(['ADMIN']), bulkGeneratePayslips as any);
router.get('/hr/payroll/reconciliation', authenticate as any, authorize(['ADMIN']), getPayrollReconciliationReport as any);
router.post('/hr/payslips', authenticate as any, authorize(['ADMIN']), generatePayslip as any);
router.put('/hr/payslips/:id/status', authenticate as any, authorize(['ADMIN']), updatePayslipStatus as any);
router.delete('/hr/payslips/:id', authenticate as any, authorize(['ADMIN']), deletePayslip as any);
router.get('/hr/employees/:id/base-salary', authenticate as any, authorize(['ADMIN']), getEmployeeBaseSalary as any);
router.put('/hr/employees/:id/base-salary', authenticate as any, authorize(['ADMIN']), setEmployeeBaseSalary as any);
router.get('/hr/employees/:id/probation', authenticate as any, authorize(['ADMIN']), getEmployeeProbation as any);
router.put('/hr/employees/:id/probation', authenticate as any, authorize(['ADMIN']), setEmployeeProbation as any);
router.get('/hr/employees/on-probation', authenticate as any, authorize(['ADMIN', 'MANAGER']), getEmployeesOnProbation as any);

// Shifts
router.get('/hr/shifts', authenticate as any, getShifts as any);
router.post('/hr/shifts', authenticate as any, authorize(['ADMIN', 'MANAGER']), createShift as any);
router.get('/hr/shifts/assignments', authenticate as any, getShiftAssignments as any);
router.post('/hr/shifts/assign', authenticate as any, authorize(['ADMIN', 'MANAGER']), assignShift as any);
router.post('/hr/shifts/swap', authenticate as any, createSwapRequest as any);
router.get('/hr/shifts/swaps', authenticate as any, getSwapRequests as any);
router.put('/hr/shifts/swaps/:id/status', authenticate as any, authorize(['ADMIN', 'MANAGER']), updateSwapRequestStatus as any);
router.delete('/hr/shifts/assignments/:id', authenticate as any, authorize(['ADMIN']), deleteShiftAssignment as any);
router.delete('/hr/shifts/:id', authenticate as any, authorize(['ADMIN']), deleteShift as any);

// Recognition
router.get('/hr/recognitions', authenticate as any, getRecognitions as any);
router.get('/hr/my-wishes', authenticate as any, getMyWishes as any);
router.get('/hr/celebration-wishes', authenticate as any, getCelebrationWishes as any);
router.post('/hr/recognitions', authenticate as any, createRecognition as any);
router.delete('/hr/recognitions/:id', authenticate as any, authorize(['ADMIN']), deleteRecognition as any);
router.get('/hr/celebrations', authenticate as any, getCelebrations as any);

export default router;
