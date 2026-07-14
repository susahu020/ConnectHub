import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

export const getSystemUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        department: { select: { id: true, name: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    // Strip passwords
    const safeUsers = users.map(({ passwordHash, ...user }) => user);
    res.status(200).json(safeUsers);
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE_USER_ROLE',
        details: `Updated role of user ${user.email} to ${role}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.status(200).json({ message: 'User role updated successfully.', userId, role });
  } catch (error) {
    next(error);
  }
};

export const toggleUserVerification = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { isVerified } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isVerified },
    });

    // Revoke sessions if suspending (setting isVerified = false)
    if (!isVerified) {
      await prisma.$transaction([
        prisma.refreshToken.deleteMany({ where: { userId } }),
        prisma.session.deleteMany({ where: { userId } }),
        prisma.user.update({ where: { id: userId }, data: { status: 'OFFLINE' } }),
      ]);
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'TOGGLE_USER_SUSPENSION',
        details: `${isVerified ? 'Activated' : 'Suspended'} user ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.status(200).json({ message: `User status updated to ${isVerified ? 'verified' : 'suspended'}.` });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        employees: true,
        tasks: true,
      },
    });

    const stats = departments.map((dept) => {
      const totalEmployees = dept.employees.length;
      const completedTasks = dept.tasks.filter((t) => t.status === 'COMPLETED').length;
      const openTasks = dept.tasks.length - completedTasks;

      return {
        id: dept.id,
        name: dept.name,
        totalEmployees,
        completedTasks,
        openTasks,
      };
    });

    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, managerId } = req.body;

    const department = await prisma.department.create({
      data: {
        name,
        description,
        managerId: managerId || null,
      },
    });

    res.status(201).json(department);
  } catch (error) {
    next(error);
  }
};

export const getDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.status(200).json(departments);
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.department.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Department deleted successfully.', departmentId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch real-time CPU, RAM, Postgres connection pools, and Redis key stats.
 */
export const getSystemMetrics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const os = require('os');
  const redis = require('../config/redis').default;

  try {
    const processCpu = process.cpuUsage();
    const systemMemoryTotal = os.totalmem();
    const systemMemoryFree = os.freemem();
    const processMemory = process.memoryUsage();

    // Query active postgres client connections
    const activePgConnectionsResult: any = await prisma.$queryRaw`
      SELECT count(*)::int as count FROM pg_stat_activity
    `.catch(() => [{ count: 1 }]);
    const activePgConnections = activePgConnectionsResult[0]?.count || 1;

    // Query Redis keys count
    let redisStatus = 'Healthy';
    let redisKeysCount = 0;
    try {
      if (redis && redis.status === 'ready') {
        redisKeysCount = await redis.dbsize().catch(() => 0);
      } else {
        redisStatus = redis ? redis.status : 'Offline';
      }
    } catch (err) {
      redisStatus = 'Error';
    }

    const totalTasksCount = await prisma.task.count();
    const totalUsersCount = await prisma.user.count();
    const totalLogsCount = await prisma.auditLog.count();

    res.status(200).json({
      system: {
        cpuUsage: ((processCpu.user + processCpu.system) / 1000000).toFixed(2),
        totalMemory: (systemMemoryTotal / 1024 / 1024 / 1024).toFixed(2),
        freeMemory: (systemMemoryFree / 1024 / 1024 / 1024).toFixed(2),
        processMemory: (processMemory.rss / 1024 / 1024).toFixed(2),
      },
      database: {
        activeConnections: activePgConnections,
        totalUsers: totalUsersCount,
        totalTasks: totalTasksCount,
      },
      redis: {
        status: redisStatus,
        keysCount: redisKeysCount,
      },
      queue: {
        totalAuditLogs: totalLogsCount,
        workerStatus: 'Running',
      }
    });
  } catch (error) {
    next(error);
  }
};
