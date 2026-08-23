// Mock the Prisma client before importing the module under test, since
// approval.service.ts imports the real singleton from '../config/db'.
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import prisma from '../../config/db';
import { isAuthorizedApprover, isManagerOrAdmin, getVisibleUserIds } from '../approval.service';

const mockedFindUnique = prisma.user.findUnique as jest.Mock;
const mockedFindMany = prisma.user.findMany as jest.Mock;

describe('isAuthorizedApprover', () => {
  beforeEach(() => {
    mockedFindUnique.mockReset();
  });

  it('always authorizes an Admin, regardless of the target user', async () => {
    const result = await isAuthorizedApprover('admin-1', 'ADMIN', 'employee-99');
    expect(result).toBe(true);
    // Admins bypass entirely — should not even need to look up the target user.
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it('never authorizes a plain Employee, even for their own direct report scenario', async () => {
    const result = await isAuthorizedApprover('employee-1', 'EMPLOYEE', 'employee-2');
    expect(result).toBe(false);
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it("authorizes a Manager when they ARE the target user's reporting manager", async () => {
    mockedFindUnique.mockResolvedValue({ managerId: 'manager-1' });
    const result = await isAuthorizedApprover('manager-1', 'MANAGER', 'employee-1');
    expect(result).toBe(true);
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { id: 'employee-1' },
      select: { managerId: true },
    });
  });

  it("does NOT authorize a Manager who is NOT the target user's reporting manager — this is the exact bug this project shipped with", async () => {
    // employee-1 actually reports to manager-2, not manager-1
    mockedFindUnique.mockResolvedValue({ managerId: 'manager-2' });
    const result = await isAuthorizedApprover('manager-1', 'MANAGER', 'employee-1');
    expect(result).toBe(false);
  });

  it('does not authorize a Manager when the target user has no manager set at all', async () => {
    mockedFindUnique.mockResolvedValue({ managerId: null });
    const result = await isAuthorizedApprover('manager-1', 'MANAGER', 'employee-1');
    expect(result).toBe(false);
  });

  it('does not authorize when the target user cannot be found', async () => {
    mockedFindUnique.mockResolvedValue(null);
    const result = await isAuthorizedApprover('manager-1', 'MANAGER', 'nonexistent-user');
    expect(result).toBe(false);
  });
});

describe('isManagerOrAdmin', () => {
  it('returns true for ADMIN', () => {
    expect(isManagerOrAdmin('ADMIN')).toBe(true);
  });

  it('returns true for MANAGER', () => {
    expect(isManagerOrAdmin('MANAGER')).toBe(true);
  });

  it('returns false for EMPLOYEE', () => {
    expect(isManagerOrAdmin('EMPLOYEE')).toBe(false);
  });

  it('returns false for an unrecognized role string', () => {
    expect(isManagerOrAdmin('SUPERUSER')).toBe(false);
  });
});

describe('getVisibleUserIds', () => {
  beforeEach(() => {
    mockedFindMany.mockReset();
  });

  it('returns null (unrestricted) for an Admin, without querying direct reports', async () => {
    const result = await getVisibleUserIds('admin-1', 'ADMIN');
    expect(result).toBeNull();
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("returns the Manager's own id plus their direct reports' ids", async () => {
    mockedFindMany.mockResolvedValue([{ id: 'employee-1' }, { id: 'employee-2' }]);
    const result = await getVisibleUserIds('manager-1', 'MANAGER');
    expect(result).toEqual(['manager-1', 'employee-1', 'employee-2']);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { managerId: 'manager-1' },
      select: { id: true },
    });
  });

  it('returns only the Manager themselves when they have no direct reports — not org-wide access', async () => {
    mockedFindMany.mockResolvedValue([]);
    const result = await getVisibleUserIds('manager-1', 'MANAGER');
    expect(result).toEqual(['manager-1']);
  });

  it('returns only the caller themselves for a plain Employee', async () => {
    const result = await getVisibleUserIds('employee-1', 'EMPLOYEE');
    expect(result).toEqual(['employee-1']);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });
});
