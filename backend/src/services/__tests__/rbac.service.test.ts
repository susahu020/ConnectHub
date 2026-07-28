// Mock Prisma and Redis before importing the module under test.
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    customRole: { findUnique: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    status: 'end', // treated as "not available" so tests exercise the DB path, not the cache
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

import prisma from '../../config/db';
import { hasPermission, getRolePermissions } from '../rbac.service';

const mockedUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockedRoleFindUnique = prisma.customRole.findUnique as jest.Mock;

describe('hasPermission', () => {
  beforeEach(() => {
    mockedUserFindUnique.mockReset();
    mockedRoleFindUnique.mockReset();
  });

  it('returns false for a user that does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue(null);
    const result = await hasPermission('ghost-user', 'Users', 'Update');
    expect(result).toBe(false);
  });

  it('legacy ADMIN role bypasses all permission checks, without needing a custom role at all', async () => {
    mockedUserFindUnique.mockResolvedValue({ role: 'ADMIN', customRoleId: null });
    const result = await hasPermission('admin-1', 'AnyModule', 'AnyAction');
    expect(result).toBe(true);
    // Should short-circuit before ever looking up a CustomRole.
    expect(mockedRoleFindUnique).not.toHaveBeenCalled();
  });

  it('returns false for a non-admin user with no custom role assigned', async () => {
    mockedUserFindUnique.mockResolvedValue({ role: 'EMPLOYEE', customRoleId: null });
    const result = await hasPermission('user-1', 'Tasks', 'Create');
    expect(result).toBe(false);
  });

  it('returns true when the custom role has the exact permission enabled', async () => {
    mockedUserFindUnique.mockResolvedValue({ role: 'EMPLOYEE', customRoleId: 'role-employee' });
    mockedRoleFindUnique.mockResolvedValue({
      id: 'role-employee',
      parentId: null,
      permissions: [{ module: 'Messages', action: 'Create', isEnabled: true }],
    });
    const result = await hasPermission('user-1', 'Messages', 'Create');
    expect(result).toBe(true);
  });

  it('returns false when the permission exists but is explicitly disabled', async () => {
    mockedUserFindUnique.mockResolvedValue({ role: 'EMPLOYEE', customRoleId: 'role-employee' });
    mockedRoleFindUnique.mockResolvedValue({
      id: 'role-employee',
      parentId: null,
      permissions: [{ module: 'Files', action: 'Delete', isEnabled: false }],
    });
    const result = await hasPermission('user-1', 'Files', 'Delete');
    expect(result).toBe(false);
  });

  it('returns false for a module/action the role was never granted', async () => {
    mockedUserFindUnique.mockResolvedValue({ role: 'MANAGER', customRoleId: 'role-manager' });
    mockedRoleFindUnique.mockResolvedValue({
      id: 'role-manager',
      parentId: null,
      permissions: [{ module: 'Tasks', action: 'Create', isEnabled: true }],
    });
    const result = await hasPermission('manager-1', 'Payroll', 'Update');
    expect(result).toBe(false);
  });

  it("inherits a permission from the parent role when the child role doesn't define it — this is how Manager should get baseline Employee permissions", async () => {
    mockedUserFindUnique.mockResolvedValue({ role: 'MANAGER', customRoleId: 'role-manager' });
    mockedRoleFindUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'role-manager') {
        return Promise.resolve({
          id: 'role-manager',
          parentId: 'role-employee',
          permissions: [{ module: 'Users', action: 'Update', isEnabled: true }], // Manager-specific grant
        });
      }
      if (where.id === 'role-employee') {
        return Promise.resolve({
          id: 'role-employee',
          parentId: null,
          permissions: [{ module: 'Messages', action: 'Read', isEnabled: true }], // baseline from Employee
        });
      }
      return Promise.resolve(null);
    });

    // Directly-granted permission on the Manager role itself
    expect(await hasPermission('manager-1', 'Users', 'Update')).toBe(true);
    // Inherited from the parent Employee role
    expect(await hasPermission('manager-1', 'Messages', 'Read')).toBe(true);
    // Neither role grants this
    expect(await hasPermission('manager-1', 'Payroll', 'Delete')).toBe(false);
  });

  it("lets the child role's own explicit permission override the parent's value for the same module/action", async () => {
    mockedUserFindUnique.mockResolvedValue({ role: 'MANAGER', customRoleId: 'role-manager' });
    mockedRoleFindUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'role-manager') {
        return Promise.resolve({
          id: 'role-manager',
          parentId: 'role-employee',
          permissions: [{ module: 'Files', action: 'Delete', isEnabled: true }], // Manager explicitly grants
        });
      }
      if (where.id === 'role-employee') {
        return Promise.resolve({
          id: 'role-employee',
          parentId: null,
          permissions: [{ module: 'Files', action: 'Delete', isEnabled: false }], // Employee explicitly denies
        });
      }
      return Promise.resolve(null);
    });

    // Child (Manager)'s explicit true should win over parent (Employee)'s explicit false.
    expect(await hasPermission('manager-1', 'Files', 'Delete')).toBe(true);
  });
});

describe('getRolePermissions', () => {
  beforeEach(() => {
    mockedRoleFindUnique.mockReset();
  });

  it('returns an empty permission map for a role that does not exist', async () => {
    mockedRoleFindUnique.mockResolvedValue(null);
    const result = await getRolePermissions('nonexistent-role');
    expect(result).toEqual({});
  });

  it('compiles a flat map of module -> action -> isEnabled for a role with no parent', async () => {
    mockedRoleFindUnique.mockResolvedValue({
      id: 'role-1',
      parentId: null,
      permissions: [
        { module: 'Tasks', action: 'Create', isEnabled: true },
        { module: 'Tasks', action: 'Delete', isEnabled: false },
      ],
    });
    const result = await getRolePermissions('role-1');
    expect(result).toEqual({ Tasks: { Create: true, Delete: false } });
  });
});
