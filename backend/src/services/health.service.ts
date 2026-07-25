import fs from 'fs';
import path from 'path';
import os from 'os';
import prisma from '../config/db';
import redis from '../config/redis';
import { getJobsHealth } from '../utils/jobHealth';
import { getErrorStats } from '../utils/errorTracker';

export type CheckStatus = 'healthy' | 'degraded' | 'down';

export interface HealthCheckResult {
  status: CheckStatus;
  message: string;
  latencyMs?: number;
  [key: string]: any;
}

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
  ]);
};

const checkDatabase = async (): Promise<HealthCheckResult> => {
  const start = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 3000);
    const latencyMs = Date.now() - start;
    return {
      status: latencyMs > 500 ? 'degraded' : 'healthy',
      message: latencyMs > 500 ? 'Connected, but responding slowly.' : 'Connected.',
      latencyMs,
    };
  } catch (err: any) {
    return { status: 'down', message: err?.message || 'Database query failed.', latencyMs: Date.now() - start };
  }
};

const checkRedis = async (): Promise<HealthCheckResult> => {
  const start = Date.now();
  try {
    await withTimeout(redis.ping(), 2000);
    const latencyMs = Date.now() - start;
    return {
      status: latencyMs > 300 ? 'degraded' : 'healthy',
      message: latencyMs > 300 ? 'Connected, but responding slowly.' : 'Connected.',
      latencyMs,
    };
  } catch (err: any) {
    // Redis is used for caching/queues, not core request paths — treat as
    // degraded rather than down, since the app keeps working without it
    // (see redis.ts: "Some caching/queue features will be limited").
    return { status: 'degraded', message: 'Not connected — caching/queue features are limited. The app otherwise works normally.', latencyMs: Date.now() - start };
  }
};

const checkEmail = (): HealthCheckResult => {
  const configured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  return {
    status: configured ? 'healthy' : 'degraded',
    message: configured
      ? `SMTP configured (${process.env.SMTP_HOST || 'smtp host not set'}).`
      : 'SMTP not configured — emails fall back to console/JSON logging instead of actually sending. Set SMTP_USER/SMTP_PASS.',
    configured,
  };
};

const checkStorage = (): HealthCheckResult => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.accessSync(uploadDir, fs.constants.W_OK);
    return { status: 'healthy', message: `Uploads directory is writable (${uploadDir}).` };
  } catch (err: any) {
    return { status: 'down', message: `Uploads directory is not writable: ${err?.message || 'unknown error'}` };
  }
};

const checkRealtime = (io: any): HealthCheckResult => {
  if (!io) {
    return { status: 'down', message: 'Socket.io server is not initialized.' };
  }
  const connectedClients = io.engine?.clientsCount ?? io.sockets?.sockets?.size ?? 0;
  return { status: 'healthy', message: 'Socket.io server running.', connectedClients };
};

const checkMemory = (): HealthCheckResult => {
  const mem = process.memoryUsage();
  const totalMB = Math.round(os.totalmem() / 1024 / 1024);
  const freeMB = Math.round(os.freemem() / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const systemUsedPercent = Math.round(((totalMB - freeMB) / totalMB) * 100);

  return {
    status: systemUsedPercent > 90 ? 'degraded' : 'healthy',
    message: systemUsedPercent > 90 ? 'System memory usage is high.' : 'Normal.',
    processRssMB: rssMB,
    heapUsedMB,
    heapTotalMB,
    systemTotalMB: totalMB,
    systemFreeMB: freeMB,
    systemUsedPercent,
  };
};

const checkBackgroundJobs = (): HealthCheckResult => {
  const jobs = getJobsHealth();
  if (jobs.length === 0) {
    return { status: 'degraded', message: 'No background jobs have reported in yet.', jobs };
  }
  const now = Date.now();
  const stale = jobs.filter((j) => {
    if (!j.lastRunAt) return true; // never ran
    return now - new Date(j.lastRunAt).getTime() > j.intervalMs * 3; // missed several cycles
  });
  const failing = jobs.filter((j) => j.lastSuccess === false);

  let status: CheckStatus = 'healthy';
  let message = 'All background jobs running on schedule.';
  if (stale.length > 0) {
    status = 'down';
    message = `${stale.length} job(s) haven't run recently: ${stale.map((j) => j.name).join(', ')}.`;
  } else if (failing.length > 0) {
    status = 'degraded';
    message = `${failing.length} job(s) failed on their last run: ${failing.map((j) => j.name).join(', ')}.`;
  }
  return { status, message, jobs };
};

const checkErrorRate = (): HealthCheckResult => {
  const stats = getErrorStats();
  let status: CheckStatus = 'healthy';
  let message = 'No unusual error activity.';
  if (stats.errorsLast5Min >= 10) {
    status = 'down';
    message = `${stats.errorsLast5Min} errors in the last 5 minutes — investigate.`;
  } else if (stats.errorsLast5Min > 0) {
    status = 'degraded';
    message = `${stats.errorsLast5Min} error(s) in the last 5 minutes.`;
  }
  return { status, message, ...stats };
};

const worstStatus = (statuses: CheckStatus[]): CheckStatus => {
  if (statuses.includes('down')) return 'down';
  if (statuses.includes('degraded')) return 'degraded';
  return 'healthy';
};

export const getSystemHealth = async (io: any) => {
  const [database, redisCheck] = await Promise.all([checkDatabase(), checkRedis()]);
  const email = checkEmail();
  const storage = checkStorage();
  const realtime = checkRealtime(io);
  const memory = checkMemory();
  const backgroundJobs = checkBackgroundJobs();
  const errors = checkErrorRate();

  const checks = { database, redis: redisCheck, email, storage, realtime, memory, backgroundJobs, errors };
  const overallStatus = worstStatus(Object.values(checks).map((c) => c.status));

  const [totalUsers, activeToday, pendingLeaveRequests, pendingExpenseClaims, openTasks] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastSeen: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }).catch(() => null),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }).catch(() => null),
    prisma.expenseClaim.count({ where: { status: 'PENDING' } }).catch(() => null),
    prisma.task.count({ where: { status: { not: 'COMPLETED' } } }).catch(() => null),
  ]);

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    checks,
    quickStats: { totalUsers, activeToday, pendingLeaveRequests, pendingExpenseClaims, openTasks },
  };
};
