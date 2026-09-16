import 'dotenv/config';
import { validateStartupSecrets } from './config/validateEnv';

validateStartupSecrets();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import path from 'path';
import fs from 'fs';

// Routes & Services
import apiRoutes from './routes/api.routes';
import { initSocket } from './services/socket.service';
import { errorHandler } from './middleware/error.middleware';
import { securityHeaders } from './middleware/securityHeaders';
import { createNotification } from './services/notification.service';
import { runDailyBirthdayCheck } from './services/birthday.service';
import { runLeaveAccrualForAllActiveEmployees } from './services/leaveAccrual.service';
import { runProbationReminderCheck } from './services/probation.service';
import { trackRequest } from './utils/errorTracker';
import { registerJob, recordJobRun } from './utils/jobHealth';
import { getSystemHealth } from './services/health.service';
import { getPublicStatus } from './controllers/status.controller';
import { checkAndAlert } from './services/alerting.service';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

import prisma from './config/db';
import redis from './config/redis';

// Reset all user statuses to OFFLINE on server startup
prisma.user.updateMany({
  where: {
    status: {
      not: 'OFFLINE',
    },
  },
  data: {
    status: 'OFFLINE',
  },
})
  .then((res) => {
    console.log(`Reset ${res.count} active user presence statuses to OFFLINE on startup.`);
    
    // Seed default automation workflows if none exist
    prisma.workflow.count().then(count => {
      if (count === 0) {
        prisma.workflow.createMany({
          data: [
            {
              name: 'Notify Manager on Task Completion',
              trigger: 'TASK_COMPLETED',
              action: 'NOTIFY_MANAGER',
              isActive: true,
            },
            {
              name: 'Assign Onboarding Checklist on New Employee Sign Up',
              trigger: 'EMPLOYEE_JOINED',
              action: 'ASSIGN_ONBOARDING_TASKS',
              isActive: true,
            },
            {
              name: 'Notify Teammates on Document Upload',
              trigger: 'DOCUMENT_UPLOADED',
              action: 'NOTIFY_TEAM',
              isActive: true,
            },
          ]
        }).then((resSeed) => {
          console.log(`Seeded ${resSeed.count} default workflow automations.`);
        }).catch(err => console.error('Failed to seed workflows:', err));
      }
    }).catch(err => console.error('Failed counting workflows:', err));

    // Ensure Employee role has Groups:Create permission
    prisma.customRole.findFirst({ where: { name: 'Employee' } })
      .then((empRole) => {
        if (empRole) {
          prisma.customPermission.upsert({
            where: {
              roleId_module_action: {
                roleId: empRole.id,
                module: 'Groups',
                action: 'Create',
              }
            },
            update: { isEnabled: true },
            create: {
              roleId: empRole.id,
              module: 'Groups',
              action: 'Create',
              isEnabled: true,
            }
          }).then(() => {
            console.log('Ensured Employee role has Groups:Create permission.');
          }).catch((err) => {
            console.error('Failed to upsert Groups:Create permission for Employee:', err);
          });
        }
      });
  })
  .catch((err) => {
    console.error('Failed to reset user statuses on startup:', err);
  });

// Initialize Socket.io
const io = initSocket(server);
app.set('io', io);

// Security & Logger Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Required to view uploads in browser
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(securityHeaders);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lightweight request counter for the System Health feature's error-rate metric
app.use((req, res, next) => {
  trackRequest();
  next();
});

// Ensure upload directory exists and serve static files from it
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// The directory existing doesn't mean this process can write to it — most
// commonly when it's a mounted volume owned by a different user than the
// one this process runs as (see docker-entrypoint.sh for how the Docker
// image itself avoids this). Checking at boot means a misconfiguration
// shows up immediately in the startup logs, rather than as a confusing
// EACCES the first time someone tries to upload an avatar, a file, or the
// organization logo.
try {
  fs.accessSync(uploadDir, fs.constants.W_OK);
} catch {
  console.error(
    `[startup] WARNING: the uploads directory (${uploadDir}) exists but is not writable by this process ` +
    `(running as uid ${process.getuid?.()}). Every file/avatar/logo upload will fail with EACCES until this is ` +
    `fixed. If this directory is a mounted volume, its ownership needs to match the user this process runs as.`
  );
}
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/v1', apiRoutes);

// Health Check — fast liveness probe for orchestrators (Docker/K8s). Does
// NOT check the database/Redis/etc, deliberately: an orchestrator needs
// to tell "process crashed" apart from "process running but a dependency
// is down", and a check that depends on the DB can't make that
// distinction.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Public status page — unauthenticated, unlike the full admin System
// Health tab (GET /api/v1/admin/system-health). Previously the only
// place any real health information (DB/Redis/SMTP/storage/job
// heartbeats) was visible anywhere in the app was that admin-only tab —
// standard practice for anything calling itself enterprise-grade is to
// also have a public "is it just me or is it down" page. Reuses the same
// underlying checks as the admin view (see status.controller.ts) but
// strips out latency numbers, error messages, and business metrics
// before it leaves the server.
app.get('/status', getPublicStatus as any);

// Error handling middleware
app.use(errorHandler as any);

// Background worker for scheduled messages delivery
registerJob('scheduled-messages', 'Scheduled Message Delivery', 10000);
setInterval(async () => {
  const startedAt = Date.now();
  try {
    const now = new Date();
    const pendingMessages = await prisma.message.findMany({
      where: {
        scheduledFor: {
          lte: now,
          not: null
        }
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true }
        },
        attachments: true,
        parent: {
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true }
            }
          }
        }
      }
    });

    if (pendingMessages.length > 0) {
      for (const msg of pendingMessages) {
        // Mark message as active (nullify scheduledFor)
        await prisma.message.update({
          where: { id: msg.id },
          data: { scheduledFor: null }
        });

        // Broadcast message to clients
        const io = app.get('io');
        if (io) {
          const payload = { ...msg, scheduledFor: null };
          if (msg.groupId) {
            io.to(`group:${msg.groupId}`).emit('new_message', payload);
          } else if (msg.receiverId) {
            io.to(`user:${msg.receiverId}`).to(`user:${msg.senderId}`).emit('new_message', payload);
          }
        }
      }
      console.log(`Dispatched ${pendingMessages.length} scheduled messages.`);
    }
    recordJobRun('scheduled-messages', true, Date.now() - startedAt, `${pendingMessages.length} message(s) dispatched`);
  } catch (err: any) {
    console.error('Error in scheduled messages worker:', err);
    recordJobRun('scheduled-messages', false, Date.now() - startedAt, undefined, err?.message || String(err));
  }
}, 10000); // Check every 10 seconds

// Due Date Reminders Background Scanner (Runs every 10 minutes)
registerJob('due-date-reminders', 'Task Due Date Reminders', 10 * 60 * 1000);
setInterval(async () => {
  const startedAt = Date.now();
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksDueSoon = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: new Date(),
          lte: tomorrow,
        },
        status: { not: 'COMPLETED' },
      },
      include: {
        assignee: true,
      },
    });

    const io = app.get('io');
    let remindersSent = 0;

    for (const task of tasksDueSoon) {
      // Find if we already sent a reminder today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          relatedId: task.id,
          type: 'REMINDER',
          createdAt: {
            gte: todayStart,
          },
        },
      });

      if (!existingNotif) {
        await createNotification({
          userId: task.assigneeId,
          title: 'Task Due Soon Reminder',
          message: `Reminder: Task "${task.title}" is due by ${task.dueDate?.toLocaleDateString() || 'tomorrow'}.`,
          type: 'REMINDER',
          relatedId: task.id,
          io,
        });
        remindersSent++;
      }
    }
    recordJobRun('due-date-reminders', true, Date.now() - startedAt, `${remindersSent} reminder(s) sent, ${tasksDueSoon.length} task(s) due soon`);
  } catch (err: any) {
    console.error('Failed to run due date reminders scan:', err);
    recordJobRun('due-date-reminders', false, Date.now() - startedAt, undefined, err?.message || String(err));
  }
}, 10 * 60 * 1000); // Check every 10 minutes

// Birthday Wish Email Scanner — checks hourly for users whose birthday is today
// and sends them a wish email (see birthday.service.ts). Hourly rather than
// once-a-day-at-midnight because this codebase has no precise cron scheduler;
// the "already wished this year" dedup inside runDailyBirthdayCheck makes it
// safe to check this often without double-sending.
registerJob('birthday-wishes', 'Birthday Wish Emails', 60 * 60 * 1000);
setInterval(async () => {
  const startedAt = Date.now();
  try {
    const io = app.get('io');
    const result = await runDailyBirthdayCheck(io);
    recordJobRun('birthday-wishes', true, Date.now() - startedAt, `${result.sent}/${result.checked} birthday(s) wished today`);
  } catch (err: any) {
    console.error('Failed to run birthday wish scan:', err);
    recordJobRun('birthday-wishes', false, Date.now() - startedAt, undefined, err?.message || String(err));
  }
}, 60 * 60 * 1000); // Check every hour

// Run once at startup too, so a server restart doesn't wait a full interval
// before the first check (e.g. someone's birthday email would otherwise be
// delayed by up to an hour if the server happened to restart that morning).
runDailyBirthdayCheck(app.get('io')).catch((err) => console.error('Initial birthday check failed:', err));

// Leave Accrual — daily background job (see services/leaveAccrual.service.ts).
// Previously an employee's full annual leave quota was granted the instant
// their balance row was first created; this instead tops every active
// employee's balance up to whatever should have accrued by today, pro-rated
// from their joining date. Daily rather than "once a month on the 1st"
// because, like the birthday scanner above, this codebase has no precise
// cron scheduler — the engine is calendar-driven and monotonic (a balance's
// total only ever goes up), so re-running it daily (or on any other
// cadence) is safe and simply keeps things current rather than risking a
// missed monthly run.
registerJob('leave-accrual', 'Leave Balance Accrual', 24 * 60 * 60 * 1000);
setInterval(async () => {
  const startedAt = Date.now();
  try {
    const result = await runLeaveAccrualForAllActiveEmployees();
    recordJobRun(
      'leave-accrual',
      true,
      Date.now() - startedAt,
      `${result.employeesProcessed} employee(s) processed, ${result.balancesUpdated} balance(s) updated`
    );
  } catch (err: any) {
    console.error('Failed to run leave accrual job:', err);
    recordJobRun('leave-accrual', false, Date.now() - startedAt, undefined, err?.message || String(err));
  }
}, 24 * 60 * 60 * 1000); // Check daily

// Run once at startup too, same reasoning as the birthday check above —
// don't make a freshly restarted server wait a full day before an
// employee's balance reflects accrual they've already earned.
runLeaveAccrualForAllActiveEmployees().catch((err) => console.error('Initial leave accrual run failed:', err));

// Probation Reminders — daily background job (see
// services/probation.service.ts). Notifies an employee's manager once,
// within a 7-day window before probationEndDate, rather than requiring
// anyone to remember to check manually. Same daily-recheck reasoning as
// the jobs above (no precise cron scheduler here) — the dedup flag on the
// User row makes re-running safe.
registerJob('probation-reminders', 'Probation End Reminders', 24 * 60 * 60 * 1000);
setInterval(async () => {
  const startedAt = Date.now();
  try {
    const result = await runProbationReminderCheck(app.get('io'));
    recordJobRun('probation-reminders', true, Date.now() - startedAt, `${result.checked} candidate(s) checked, ${result.remindersSent} reminder(s) sent`);
  } catch (err: any) {
    console.error('Failed to run probation reminder job:', err);
    recordJobRun('probation-reminders', false, Date.now() - startedAt, undefined, err?.message || String(err));
  }
}, 24 * 60 * 60 * 1000); // Check daily

// Run once at startup too, same reasoning as the jobs above.
runProbationReminderCheck(app.get('io')).catch((err) => console.error('Initial probation reminder run failed:', err));

// System Health Monitor — runs the full health check every 2 minutes and
// fires the configured alert webhook (Admin > Organization Settings) if the
// status has changed since the last check, or is still unhealthy after 30
// minutes (see alerting.service.ts for the de-dup/re-alert logic). This is
// separate from the on-demand check the admin System Health tab triggers
// when someone has that tab open — this one runs whether or not anyone is
// looking, which is the whole point of alerting.
registerJob('health-monitor', 'System Health Monitor', 2 * 60 * 1000);
setInterval(async () => {
  const startedAt = Date.now();
  try {
    const health = await getSystemHealth(app.get('io'));
    await checkAndAlert(health);
    recordJobRun('health-monitor', true, Date.now() - startedAt, `Status: ${health.status}`);
  } catch (err: any) {
    console.error('System health monitor failed:', err);
    recordJobRun('health-monitor', false, Date.now() - startedAt, undefined, err?.message || String(err));
  }
}, 2 * 60 * 1000);

// Listen on all network interfaces
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`ConnectHub Enterprise Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Local Static Uploads Path: ${uploadDir}`);
  console.log(`==================================================`);
});

// ---------------------------------------------------------------------
// Process-level safety nets
// ---------------------------------------------------------------------
//
// Without these, a single unhandled promise rejection anywhere in the app
// (a missed .catch() on some async call three files deep) crashes the
// entire Node process ungracefully with no clean log of what happened —
// and in a container orchestrator, SIGTERM on deploy/scale/restart would
// otherwise kill the process immediately, dropping any in-flight HTTP
// requests and leaving DB/Redis connections open.

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Deliberately not exiting here — an unhandled rejection shouldn't take
  // down a running server for unrelated users. It's logged loudly so it
  // gets fixed, but the process stays up.
});

process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught Exception:', error);
  // Unlike unhandledRejection, an uncaught synchronous exception can leave
  // the process in an inconsistent state, so we do exit — but only after
  // logging, and let the container orchestrator (restart: on-failure)
  // bring up a fresh instance.
  process.exit(1);
});

let shuttingDown = false;

const gracefulShutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} received — starting graceful shutdown...`);

  // Stop accepting new connections, but let in-flight requests finish.
  server.close(async () => {
    console.log('HTTP server closed — no longer accepting new connections.');

    try {
      await prisma.$disconnect();
      console.log('Prisma disconnected.');
    } catch (err) {
      console.error('Error disconnecting Prisma:', err);
    }

    try {
      redis.disconnect();
      console.log('Redis disconnected.');
    } catch (err) {
      console.error('Error disconnecting Redis:', err);
    }

    console.log('Graceful shutdown complete.');
    process.exit(0);
  });

  // Safety valve: if something hangs (a request that never finishes, a
  // stuck connection), don't let the container hang forever waiting —
  // force exit after a bounded timeout so the orchestrator's restart
  // isn't blocked indefinitely.
  setTimeout(() => {
    console.error('Graceful shutdown timed out after 10s — forcing exit.');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
