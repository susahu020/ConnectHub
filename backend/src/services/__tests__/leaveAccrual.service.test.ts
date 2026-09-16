jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    leaveBalance: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../organization.service', () => ({
  getOrganizationSettings: jest.fn(),
}));

import prisma from '../../config/db';
import { getOrganizationSettings } from '../organization.service';
import {
  getMonthsElapsedInYear,
  computeAccruedTotal,
  ensureAccruedLeaveBalancesForEmployee,
  runLeaveAccrualForAllActiveEmployees,
  DEFAULT_LEAVE_ACCRUAL_POLICY,
} from '../leaveAccrual.service';

const mockedFindUnique = prisma.leaveBalance.findUnique as jest.Mock;
const mockedCreate = prisma.leaveBalance.create as jest.Mock;
const mockedUpdate = prisma.leaveBalance.update as jest.Mock;
const mockedUserFindMany = prisma.user.findMany as jest.Mock;
const mockedGetOrgSettings = getOrganizationSettings as jest.Mock;

beforeEach(() => {
  mockedFindUnique.mockReset();
  mockedCreate.mockReset();
  mockedUpdate.mockReset();
  mockedUserFindMany.mockReset();
  mockedGetOrgSettings.mockReset();
});

describe('getMonthsElapsedInYear', () => {
  it('counts January through the current month for someone who joined before this year', () => {
    const asOf = new Date(2026, 5, 15); // June 2026
    const joined = new Date(2020, 0, 1);
    expect(getMonthsElapsedInYear(asOf, 2026, joined)).toBe(6); // Jan..Jun inclusive
  });

  it('starts counting from the joining month for someone who joined mid-year', () => {
    const asOf = new Date(2026, 5, 15); // June
    const joined = new Date(2026, 2, 10); // joined in March
    expect(getMonthsElapsedInYear(asOf, 2026, joined)).toBe(4); // Mar, Apr, May, Jun
  });

  it('returns 0 for a year entirely before the employee joined', () => {
    const asOf = new Date(2026, 5, 15);
    const joined = new Date(2027, 0, 1);
    expect(getMonthsElapsedInYear(asOf, 2026, joined)).toBe(0);
  });

  it('returns 0 when asOfDate is in an earlier year than the one being queried', () => {
    const asOf = new Date(2025, 11, 31);
    expect(getMonthsElapsedInYear(asOf, 2026, null)).toBe(0);
  });

  it('caps at 12 full months for a year that has already fully elapsed', () => {
    const asOf = new Date(2027, 3, 1); // well into the next year
    expect(getMonthsElapsedInYear(asOf, 2026, null)).toBe(12);
  });

  it('treats a missing joiningDate as "joined before this year" (counts from January)', () => {
    const asOf = new Date(2026, 2, 1); // March
    expect(getMonthsElapsedInYear(asOf, 2026, null)).toBe(3); // Jan, Feb, Mar
  });
});

describe('computeAccruedTotal', () => {
  it('accrues monthlyRate * monthsElapsed, capped at annualTotal', () => {
    expect(computeAccruedTotal({ annualTotal: 12, monthlyRate: 1 }, 5)).toBe(5);
    expect(computeAccruedTotal({ annualTotal: 12, monthlyRate: 1 }, 12)).toBe(12);
    expect(computeAccruedTotal({ annualTotal: 12, monthlyRate: 1 }, 15)).toBe(12); // capped
  });

  it('grants the full annualTotal immediately when monthlyRate is 0', () => {
    expect(computeAccruedTotal({ annualTotal: 30, monthlyRate: 0 }, 1)).toBe(30);
    expect(computeAccruedTotal({ annualTotal: 30, monthlyRate: 0 }, 0)).toBe(30);
  });

  it('rounds to 2 decimals for a fractional monthly rate', () => {
    expect(computeAccruedTotal({ annualTotal: 8, monthlyRate: 8 / 12 }, 1)).toBeCloseTo(0.67, 2);
  });
});

describe('ensureAccruedLeaveBalancesForEmployee', () => {
  const policy = { ANNUAL: { annualTotal: 12, monthlyRate: 1 } };
  const employee = { id: 'emp-1', joiningDate: new Date(2020, 0, 1) };
  const asOf = new Date(2026, 5, 15); // June -> 6 months elapsed -> target total 6

  it('creates a new balance row at the accrued amount when none exists', async () => {
    mockedFindUnique.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: 'bal-1', total: 6, used: 0 });

    const results = await ensureAccruedLeaveBalancesForEmployee(employee, policy, asOf);

    expect(mockedCreate).toHaveBeenCalledWith({
      data: { userId: 'emp-1', leaveType: 'ANNUAL', year: 2026, total: 6, used: 0 },
    });
    expect(results).toEqual([{ leaveType: 'ANNUAL', total: 6, changed: true }]);
  });

  it('raises total to the newly accrued amount when it is higher than the existing total', async () => {
    mockedFindUnique.mockResolvedValue({ id: 'bal-1', total: 3, used: 1 });
    mockedUpdate.mockResolvedValue({ id: 'bal-1', total: 6, used: 1 });

    const results = await ensureAccruedLeaveBalancesForEmployee(employee, policy, asOf);

    expect(mockedUpdate).toHaveBeenCalledWith({ where: { id: 'bal-1' }, data: { total: 6 } });
    expect(results).toEqual([{ leaveType: 'ANNUAL', total: 6, changed: true }]);
  });

  it('never lowers total below what is already recorded, even if newly computed accrual is smaller', async () => {
    // e.g. an admin manually granted 10 days already, but calendar accrual
    // alone would only justify 6 by this point in the year.
    mockedFindUnique.mockResolvedValue({ id: 'bal-1', total: 10, used: 2 });

    const results = await ensureAccruedLeaveBalancesForEmployee(employee, policy, asOf);

    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(results).toEqual([{ leaveType: 'ANNUAL', total: 10, changed: false }]);
  });

  it('never lowers total below days already used, even if that exceeds both current total and new accrual', async () => {
    mockedFindUnique.mockResolvedValue({ id: 'bal-1', total: 5, used: 8 });

    const results = await ensureAccruedLeaveBalancesForEmployee(employee, policy, asOf);

    expect(mockedUpdate).toHaveBeenCalledWith({ where: { id: 'bal-1' }, data: { total: 8 } });
    expect(results[0].total).toBe(8);
  });

  it('is a no-op (idempotent) when called twice in a row with no time passing', async () => {
    mockedFindUnique.mockResolvedValue({ id: 'bal-1', total: 6, used: 0 });

    const results = await ensureAccruedLeaveBalancesForEmployee(employee, policy, asOf);

    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(results).toEqual([{ leaveType: 'ANNUAL', total: 6, changed: false }]);
  });
});

describe('runLeaveAccrualForAllActiveEmployees', () => {
  it('processes every active employee and falls back to the default policy when none is configured', async () => {
    mockedGetOrgSettings.mockResolvedValue({ leaveAccrualPolicy: null });
    mockedUserFindMany.mockResolvedValue([
      { id: 'emp-1', joiningDate: new Date(2020, 0, 1) },
      { id: 'emp-2', joiningDate: new Date(2020, 0, 1) },
    ]);
    mockedFindUnique.mockResolvedValue(null);
    mockedCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'new', ...data }));

    const result = await runLeaveAccrualForAllActiveEmployees(new Date(2026, 0, 15));

    expect(mockedUserFindMany).toHaveBeenCalledWith({ where: { isActive: true }, select: { id: true, joiningDate: true } });
    expect(result.employeesProcessed).toBe(2);
    // One balance created per policy leave type, per employee, all "changed".
    expect(result.balancesUpdated).toBe(2 * Object.keys(DEFAULT_LEAVE_ACCRUAL_POLICY).length);
  });

  it('uses an org-configured policy override instead of the default when present', async () => {
    const customPolicy = { ANNUAL: { annualTotal: 20, monthlyRate: 20 / 12 } };
    mockedGetOrgSettings.mockResolvedValue({ leaveAccrualPolicy: customPolicy });
    mockedUserFindMany.mockResolvedValue([{ id: 'emp-1', joiningDate: null }]);
    mockedFindUnique.mockResolvedValue(null);
    mockedCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'new', ...data }));

    await runLeaveAccrualForAllActiveEmployees(new Date(2026, 0, 15));

    expect(mockedCreate).toHaveBeenCalledTimes(1); // only ANNUAL, not the 4 default types
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ leaveType: 'ANNUAL' }) }));
  });
});
