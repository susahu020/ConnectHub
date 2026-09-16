// Mock Prisma before importing the module under test, since canViewTask
// falls back to a handful of targeted lookups (department manager, the
// assignee's own department, project team membership) for cases the task
// row alone can't answer.
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    department: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    teamMember: { findFirst: jest.fn() },
  },
}));

import prisma from '../../config/db';
import { buildTaskVisibilityWhere, buildProjectVisibilityWhere, canViewTask } from '../task.controller';

const mockedDeptFindUnique = prisma.department.findUnique as jest.Mock;
const mockedUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockedProjectFindUnique = prisma.project.findUnique as jest.Mock;
const mockedTeamMemberFindFirst = prisma.teamMember.findFirst as jest.Mock;

beforeEach(() => {
  mockedDeptFindUnique.mockReset();
  mockedUserFindUnique.mockReset();
  mockedProjectFindUnique.mockReset();
  mockedTeamMemberFindFirst.mockReset();
});

describe('buildTaskVisibilityWhere', () => {
  it('gives an Admin no restriction at all (empty where clause)', () => {
    expect(buildTaskVisibilityWhere({ id: 'admin-1', role: 'ADMIN' })).toEqual({});
  });

  it('scopes a plain Employee to assignee/creator/watcher/project-team only, with no department clause', () => {
    const where = buildTaskVisibilityWhere({ id: 'emp-1', role: 'EMPLOYEE', departmentId: 'dept-eng' });

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { assigneeId: 'emp-1' },
        { creatorId: 'emp-1' },
        { watcherIds: { has: 'emp-1' } },
        { project: { team: { members: { some: { userId: 'emp-1' } } } } },
      ])
    );
    // No department-based clauses should ever be added for a non-manager.
    expect(where.OR).not.toEqual(expect.arrayContaining([{ departmentId: 'dept-eng' }]));
  });

  it('adds department-oversight clauses (both the task-stamped department and the assignee\'s actual department) for a Manager', () => {
    const where = buildTaskVisibilityWhere({ id: 'mgr-1', role: 'MANAGER', departmentId: 'dept-eng' });

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { departmentId: 'dept-eng' },
        { assignee: { departmentId: 'dept-eng' } },
        { department: { managerId: 'mgr-1' } },
        { assignee: { department: { managerId: 'mgr-1' } } },
      ])
    );
  });

  it('still adds the two managerId-based clauses for a Manager with no department of their own', () => {
    const where = buildTaskVisibilityWhere({ id: 'mgr-1', role: 'MANAGER', departmentId: null });

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { department: { managerId: 'mgr-1' } },
        { assignee: { department: { managerId: 'mgr-1' } } },
      ])
    );
    expect(where.OR).not.toEqual(expect.arrayContaining([{ departmentId: null }]));
  });
});

describe('canViewTask', () => {
  const baseTask = {
    assigneeId: 'assignee-1',
    creatorId: 'creator-1',
    watcherIds: ['watcher-1'],
    departmentId: 'dept-eng',
    projectId: 'proj-1',
  };

  it('always allows an Admin, without touching the database', async () => {
    const result = await canViewTask(baseTask, { id: 'admin-1', role: 'ADMIN' });
    expect(result).toBe(true);
    expect(mockedDeptFindUnique).not.toHaveBeenCalled();
  });

  it('allows the assignee', async () => {
    const result = await canViewTask(baseTask, { id: 'assignee-1', role: 'EMPLOYEE' });
    expect(result).toBe(true);
  });

  it('allows the creator', async () => {
    const result = await canViewTask(baseTask, { id: 'creator-1', role: 'EMPLOYEE' });
    expect(result).toBe(true);
  });

  it('allows an explicit watcher', async () => {
    const result = await canViewTask(baseTask, { id: 'watcher-1', role: 'EMPLOYEE' });
    expect(result).toBe(true);
  });

  it('blocks a plain Employee who is not assignee/creator/watcher and not on the project team', async () => {
    mockedProjectFindUnique.mockResolvedValue({ teamId: 'team-1' });
    mockedTeamMemberFindFirst.mockResolvedValue(null);

    const result = await canViewTask(baseTask, { id: 'stranger-1', role: 'EMPLOYEE', departmentId: 'dept-eng' });

    // Being in the same department is irrelevant for a non-manager.
    expect(result).toBe(false);
  });

  it('allows a teammate on the task\'s project team, even with no other relation to the task', async () => {
    mockedProjectFindUnique.mockResolvedValue({ teamId: 'team-1' });
    mockedTeamMemberFindFirst.mockResolvedValue({ id: 'membership-1' });

    const result = await canViewTask(baseTask, { id: 'teammate-1', role: 'EMPLOYEE' });

    expect(result).toBe(true);
    expect(mockedTeamMemberFindFirst).toHaveBeenCalledWith({ where: { teamId: 'team-1', userId: 'teammate-1' } });
  });

  it('allows a Manager whose own departmentId matches the task\'s departmentId, without a DB lookup', async () => {
    const result = await canViewTask(baseTask, { id: 'mgr-1', role: 'MANAGER', departmentId: 'dept-eng' });

    expect(result).toBe(true);
    expect(mockedDeptFindUnique).not.toHaveBeenCalled();
  });

  it('allows a Manager who formally manages the task\'s department, even from a different department themselves', async () => {
    mockedDeptFindUnique.mockResolvedValue({ managerId: 'mgr-1' });

    const result = await canViewTask(baseTask, { id: 'mgr-1', role: 'MANAGER', departmentId: 'dept-sales' });

    expect(result).toBe(true);
    expect(mockedDeptFindUnique).toHaveBeenCalledWith({ where: { id: 'dept-eng' }, select: { managerId: true } });
  });

  it('allows a Manager based on the assignee\'s real department, even when the task\'s stamped departmentId differs', async () => {
    // Task was filed under Sales (e.g. by a Sales creator) but is actually
    // assigned to someone in Engineering.
    const crossDeptTask = { ...baseTask, departmentId: 'dept-sales' };
    mockedDeptFindUnique.mockResolvedValueOnce({ managerId: 'someone-else' }); // dept-sales manager lookup misses
    mockedUserFindUnique.mockResolvedValue({ departmentId: 'dept-eng' });

    const result = await canViewTask(crossDeptTask, { id: 'mgr-eng', role: 'MANAGER', departmentId: 'dept-eng' });

    expect(result).toBe(true);
    expect(mockedUserFindUnique).toHaveBeenCalledWith({ where: { id: 'assignee-1' }, select: { departmentId: true } });
  });

  it('blocks a Manager from an unrelated department who neither manages it nor manages the assignee\'s department', async () => {
    mockedDeptFindUnique.mockResolvedValue({ managerId: 'someone-else' });
    mockedUserFindUnique.mockResolvedValue({ departmentId: 'dept-eng' });
    mockedProjectFindUnique.mockResolvedValue({ teamId: 'team-1' });
    mockedTeamMemberFindFirst.mockResolvedValue(null);

    const result = await canViewTask(baseTask, { id: 'mgr-hr', role: 'MANAGER', departmentId: 'dept-hr' });

    expect(result).toBe(false);
  });

  it('falls through to project-team membership for a Manager who fails every department check', async () => {
    mockedDeptFindUnique.mockResolvedValue({ managerId: 'someone-else' });
    mockedUserFindUnique.mockResolvedValue({ departmentId: 'dept-eng' });
    mockedProjectFindUnique.mockResolvedValue({ teamId: 'team-1' });
    mockedTeamMemberFindFirst.mockResolvedValue({ id: 'membership-1' });

    const result = await canViewTask(baseTask, { id: 'mgr-hr', role: 'MANAGER', departmentId: 'dept-hr' });

    expect(result).toBe(true);
  });

  it('returns false for a task with no project when no other rule matches', async () => {
    const noProjectTask = { ...baseTask, projectId: null };

    const result = await canViewTask(noProjectTask, { id: 'stranger-1', role: 'EMPLOYEE' });

    expect(result).toBe(false);
    expect(mockedProjectFindUnique).not.toHaveBeenCalled();
  });
});

describe('buildProjectVisibilityWhere', () => {
  it('gives an Admin no restriction at all', () => {
    expect(buildProjectVisibilityWhere({ id: 'admin-1', role: 'ADMIN' })).toEqual({});
  });

  it('scopes a plain Employee to team membership or having a task in the project, with no department clause', () => {
    const where = buildProjectVisibilityWhere({ id: 'emp-1', role: 'EMPLOYEE', departmentId: 'dept-eng' });

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { team: { members: { some: { userId: 'emp-1' } } } },
        {
          tasks: {
            some: {
              OR: [{ assigneeId: 'emp-1' }, { creatorId: 'emp-1' }, { watcherIds: { has: 'emp-1' } }],
            },
          },
        },
      ])
    );
    expect(where.OR).not.toEqual(expect.arrayContaining([{ team: { departmentId: 'dept-eng' } }]));
  });

  it('adds department-oversight clauses for a Manager', () => {
    const where = buildProjectVisibilityWhere({ id: 'mgr-1', role: 'MANAGER', departmentId: 'dept-eng' });

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { team: { departmentId: 'dept-eng' } },
        { team: { department: { managerId: 'mgr-1' } } },
      ])
    );
  });
});
