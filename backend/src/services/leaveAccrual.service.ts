import prisma from '../config/db';
import { getOrganizationSettings } from './organization.service';

// ==========================================
// LEAVE ACCRUAL AUTOMATION
// ==========================================
// getLeaveBalances previously granted the *entire* annual quota (12 ANNUAL,
// 8 SICK, 6 CASUAL, 30 UNPAID) the instant a balance row was first created —
// a flat one-time grant with no ongoing accrual, no pro-ration for someone
// who joined mid-year, and no distinction between "policy" and "what's
// actually earned so far". This engine computes what should have accrued
// by a given date instead, and both the on-demand leave-balances lookup and
// a daily background job (see index.ts) keep balances in sync with it.

export interface LeaveAccrualPolicyEntry {
  /** Full annual entitlement once fully accrued. */
  annualTotal: number;
  /**
   * Days accrued per elapsed month. 0 means "not accrued" — the full
   * annualTotal is granted immediately instead (appropriate for a type like
   * UNPAID, which isn't really an earned benefit that builds up over time).
   */
  monthlyRate: number;
}

export type LeaveAccrualPolicy = Record<string, LeaveAccrualPolicyEntry>;

export const DEFAULT_LEAVE_ACCRUAL_POLICY: LeaveAccrualPolicy = {
  ANNUAL: { annualTotal: 12, monthlyRate: 1 },
  SICK: { annualTotal: 8, monthlyRate: 8 / 12 },
  CASUAL: { annualTotal: 6, monthlyRate: 0.5 },
  UNPAID: { annualTotal: 30, monthlyRate: 0 },
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * How many months of the given year (1..12) an employee has been eligible
 * to accrue leave as of `asOfDate` — counting the joining month itself as
 * month 1 if they joined partway through the year, and clamping to the
 * year's actual bounds. Returns 0 for a year entirely before joining, or
 * entirely after `asOfDate`.
 */
export const getMonthsElapsedInYear = (asOfDate: Date, year: number, joiningDate?: Date | null): number => {
  if (asOfDate.getFullYear() < year) return 0;

  const startMonth = joiningDate && joiningDate.getFullYear() === year ? joiningDate.getMonth() : 0;
  if (joiningDate && joiningDate.getFullYear() > year) return 0;

  const asOfMonth = asOfDate.getFullYear() > year ? 11 : asOfDate.getMonth();
  const elapsed = asOfMonth - startMonth + 1;
  return Math.max(0, Math.min(12, elapsed));
};

/** Accrued total for one leave type as of a given point in the year. Never exceeds annualTotal. */
export const computeAccruedTotal = (policyEntry: LeaveAccrualPolicyEntry, monthsElapsed: number): number => {
  if (policyEntry.monthlyRate <= 0) return policyEntry.annualTotal;
  return Math.min(policyEntry.annualTotal, round2(policyEntry.monthlyRate * monthsElapsed));
};

/**
 * Brings one employee's LeaveBalance rows (for `asOfDate`'s year) up to
 * what should have accrued by now, for every leave type in the policy.
 * Creates a row at the accrued amount if none exists yet. For an existing
 * row, the total can only go up, never down — it's set to
 * max(current total, current used, newly-computed accrual) — so this is
 * always safe to re-run: an admin's manual adjustment or an employee's
 * already-used days are never clobbered by a recalculation.
 */
export const ensureAccruedLeaveBalancesForEmployee = async (
  employee: { id: string; joiningDate: Date | null },
  policy: LeaveAccrualPolicy,
  asOfDate: Date
) => {
  const year = asOfDate.getFullYear();
  const monthsElapsed = getMonthsElapsedInYear(asOfDate, year, employee.joiningDate);
  const results: Array<{ leaveType: string; total: number; changed: boolean }> = [];

  for (const [leaveType, policyEntry] of Object.entries(policy)) {
    const targetTotal = computeAccruedTotal(policyEntry, monthsElapsed);

    const existing = await prisma.leaveBalance.findUnique({
      where: { userId_leaveType_year: { userId: employee.id, leaveType, year } },
    });

    if (!existing) {
      const created = await prisma.leaveBalance.create({
        data: { userId: employee.id, leaveType, year, total: targetTotal, used: 0 },
      });
      results.push({ leaveType, total: created.total, changed: true });
      continue;
    }

    const newTotal = Math.max(existing.total, existing.used, targetTotal);
    if (newTotal !== existing.total) {
      await prisma.leaveBalance.update({ where: { id: existing.id }, data: { total: newTotal } });
      results.push({ leaveType, total: newTotal, changed: true });
    } else {
      results.push({ leaveType, total: existing.total, changed: false });
    }
  }

  return results;
};

/**
 * Runs accrual for every active employee. Used both by the daily background
 * job (index.ts) and by the on-demand Admin "run now" endpoint
 * (hr.controller.ts's runLeaveAccrual) — safe to call as often as needed
 * since it's idempotent per the monotonic max() rule above.
 */
export const runLeaveAccrualForAllActiveEmployees = async (asOfDate: Date = new Date()) => {
  const settings = await getOrganizationSettings();
  const policy: LeaveAccrualPolicy = settings.leaveAccrualPolicy || DEFAULT_LEAVE_ACCRUAL_POLICY;

  const employees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, joiningDate: true },
  });

  let employeesProcessed = 0;
  let balancesUpdated = 0;

  for (const employee of employees) {
    const results = await ensureAccruedLeaveBalancesForEmployee(employee, policy, asOfDate);
    employeesProcessed += 1;
    balancesUpdated += results.filter((r) => r.changed).length;
  }

  return { employeesProcessed, balancesUpdated };
};

// ==========================================
// POLICY VALIDATION
// ==========================================
// Used by organization.controller.ts's updateOrganizationSettings before
// writing an admin-submitted policy to
// OrganizationSettings.leaveAccrualPolicy — same "sanitize, don't trust
// client shape blindly" treatment as statutoryDeductions.service.ts and
// attendanceAnomaly.service.ts's validators. Generic over leave-type keys
// (not just ANNUAL/SICK/CASUAL/UNPAID) since LeaveRequest.leaveType is a
// free-text field, not an enum — ensureAccruedLeaveBalancesForEmployee
// above already iterates the policy generically via Object.entries.
const isFiniteNonNegative = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export const validateLeaveAccrualPolicy = (
  input: any
): { valid: true; policy: LeaveAccrualPolicy } | { valid: false; error: string } => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { valid: false, error: 'leaveAccrualPolicy must be an object mapping leave types to accrual rules.' };
  }
  const entries = Object.entries(input);
  if (entries.length === 0) {
    return { valid: false, error: 'leaveAccrualPolicy must have at least one leave type.' };
  }

  const policy: LeaveAccrualPolicy = {};
  for (const [leaveType, rawEntry] of entries) {
    if (typeof leaveType !== 'string' || !leaveType.trim()) {
      return { valid: false, error: 'Each leave type key must be a non-empty string.' };
    }
    if (typeof rawEntry !== 'object' || rawEntry === null) {
      return { valid: false, error: `${leaveType}: entry must be an object with annualTotal and monthlyRate.` };
    }
    const entry = rawEntry as any;
    if (!isFiniteNonNegative(entry.annualTotal)) {
      return { valid: false, error: `${leaveType}.annualTotal must be a non-negative number.` };
    }
    if (!isFiniteNonNegative(entry.monthlyRate)) {
      return { valid: false, error: `${leaveType}.monthlyRate must be a non-negative number.` };
    }
    policy[leaveType.trim().toUpperCase()] = { annualTotal: entry.annualTotal, monthlyRate: entry.monthlyRate };
  }

  return { valid: true, policy };
};
