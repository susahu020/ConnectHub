import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { invalidateEmailFeatureSettingsCache, buildNotificationEmail, isEmailFeatureEnabled, EmailFeatureKey } from '../services/notification.service';
import { buildBirthdayEmailHtml } from '../services/birthday.service';
import { getSystemHealth as getSystemHealthData } from '../services/health.service';
import { sendWebhookAlert } from '../services/alerting.service';
import { deleteUserAccount } from '../services/accountDeletion.service';
import { checkPasswordStrength, checkPasswordAgainstIdentity } from '../utils/passwordPolicy';
import { sendEmail } from '../config/mailer';
import { getOrganizationSettings } from '../services/organization.service';
import { emitDataUpdate } from '../utils/realtime';

// The set of columns an admin is allowed to toggle via updateEmailFeatureSettings.
// Keeping an explicit whitelist means an unexpected key in the request body
// (e.g. `id`, `updatedAt`) can never be written to the row.
const EMAIL_FEATURE_KEYS = [
  'newMessageEmail',
  'groupMessageEmail',
  'groupCreationEmail',
  'taskAssignedEmail',
  'taskUpdatedEmail',
  'announcementEmail',
  'meetingInviteEmail',
  'fileSharedEmail',
  'birthdayWishEmail',
] as const;

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

    // Keep the granular RBAC role in sync with the legacy role dropdown, so
    // checkPermission-gated routes (tasks, projects, groups, files, invites)
    // actually reflect the role this admin just assigned instead of whatever
    // customRoleId happened to be set (or unset) before.
    const customRoleName = role === 'ADMIN' ? 'Admin' : role === 'MANAGER' ? 'Manager' : 'Employee';
    const roleRecord = await prisma.customRole.findUnique({ where: { name: customRoleName } });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role, customRoleId: roleRecord?.id },
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

    emitDataUpdate(req, 'users');
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

    emitDataUpdate(req, 'org');
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

    emitDataUpdate(req, 'org');
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

/**
 * Update details of any user by Admin.
 */
export const adminUpdateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, designation, location, email, role, customRoleId, managerId, departmentId, joiningDate } = req.body;

    if (managerId !== undefined && managerId !== null && managerId !== '') {
      if (managerId === id) {
        res.status(400).json({ message: 'A user cannot be set as their own reporting manager.' });
        return;
      }
      const managerExists = await prisma.user.findUnique({ where: { id: managerId }, select: { id: true } });
      if (!managerExists) {
        res.status(400).json({ message: 'The selected reporting manager does not exist.' });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        designation,
        location,
        email,
        role,
        customRoleId: customRoleId || null,
        managerId: managerId !== undefined ? (managerId === 'null' || managerId === '' ? null : managerId) : undefined,
        departmentId: departmentId !== undefined ? (departmentId === 'null' || departmentId === '' ? null : departmentId) : undefined,
        joiningDate: joiningDate ? new Date(joiningDate) : (joiningDate === null ? null : undefined),
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'ADMIN_UPDATE_USER',
        details: `Updated details for user ${email} (${id})`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    emitDataUpdate(req, 'users');
    if (managerId !== undefined || departmentId !== undefined) {
      emitDataUpdate(req, 'org');
    }

    res.status(200).json({ message: 'User updated successfully.', user: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user from database by Admin.
 */
export const adminDeleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      res.status(400).json({ message: 'You cannot delete your own account. Use Settings > Privacy to delete your own account instead.' });
      return;
    }

    const result = await deleteUserAccount(id, { id: req.user!.id, isSelfService: false });
    if (!result.ok) {
      res.status(400).json({ message: result.message });
      return;
    }

    emitDataUpdate(req, 'users');
    emitDataUpdate(req, 'org');
    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Force password change for any user by Admin.
 */
export const adminChangeUserPassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const strengthCheck = checkPasswordStrength(password);
    if (!strengthCheck.valid) {
      res.status(400).json({ message: strengthCheck.message });
      return;
    }

    const userRecord = await prisma.user.findUnique({ where: { id } });
    if (!userRecord) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const identityCheck = checkPasswordAgainstIdentity(password, { email: userRecord.email, firstName: userRecord.firstName, lastName: userRecord.lastName });
    if (!identityCheck.valid) {
      res.status(400).json({ message: identityCheck.message });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'ADMIN_CHANGE_PASSWORD',
        details: `Forced password change for user ${userRecord.email} (${id})`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    res.status(200).json({ message: 'User password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get the platform-wide email-notification feature toggles.
 * Creates the (all-enabled) singleton row on first access.
 */
export const getEmailFeatureSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let settings = await prisma.emailFeatureSettings.findFirst();
    if (!settings) {
      settings = await prisma.emailFeatureSettings.create({ data: {} });
    }

    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

/**
 * Update one or more email-notification feature toggles. Accepts a partial
 * object of { [featureKey]: boolean }; only whitelisted keys are applied.
 */
export const updateEmailFeatureSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates: Record<string, boolean> = {};
    for (const key of EMAIL_FEATURE_KEYS) {
      if (typeof req.body[key] === 'boolean') {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'No valid email feature toggles were provided.' });
      return;
    }

    let existing = await prisma.emailFeatureSettings.findFirst();
    if (!existing) {
      existing = await prisma.emailFeatureSettings.create({ data: {} });
    }

    const settings = await prisma.emailFeatureSettings.update({
      where: { id: existing.id },
      data: { ...updates, updatedById: req.user?.id },
    });

    // Make sure the notification service picks up the change immediately
    // instead of serving a stale cached copy for up to CACHE_TTL_MS.
    invalidateEmailFeatureSettingsCache();

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE_EMAIL_FEATURE_SETTINGS',
        details: `Updated email notification settings: ${JSON.stringify(updates)}`,
      },
    });

    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: send a real test email through the current SMTP configuration so
 * the admin can verify email delivery is actually working, on demand,
 * without needing to trigger a real business event (message, task, etc.)
 * or wait for one to happen. Defaults to the requesting admin's own email
 * if no target is given.
 */
export const sendTestEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetEmail = (req.body?.to && String(req.body.to).trim()) || req.user?.email;

    if (!targetEmail) {
      res.status(400).json({ message: 'No target email address available.' });
      return;
    }

    const orgSettings = await getOrganizationSettings();
    const orgName = orgSettings.orgName || 'ConnectHub';
    const sentAt = new Date().toLocaleString();

    const subject = `${orgName} - Test Email`;
    const text = `This is a test email sent from the ${orgName} Admin Panel at ${sentAt} to verify your email notification configuration is working correctly.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #4f46e5; margin-top: 0;">✅ Test Email</h2>
        <p>This is a test email sent from the <strong>${orgName}</strong> Admin Panel to verify your email notification configuration is working correctly.</p>
        <p style="font-size: 12px; color: #64748b;">Sent at ${sentAt} by ${req.user?.firstName || 'an admin'}.</p>
        <p style="font-size: 12px; color: #64748b;">If you received this, outbound email delivery is working.</p>
      </div>
    `;

    const result: any = await sendEmail(targetEmail, subject, text, html);

    if (result?.mode === 'not-configured') {
      res.status(200).json({
        success: false,
        mode: 'not-configured',
        message: 'SMTP is not configured (missing SMTP_USER/SMTP_PASS). The email was not actually sent — the mailer is running in console/JSON fallback mode.',
      });
      return;
    }

    if (result?.mode === 'fallback' || result?.success === false) {
      res.status(200).json({
        success: false,
        mode: 'fallback',
        message: `SMTP send failed: ${result?.error || 'unknown error'}. Check SMTP_HOST/SMTP_USER/SMTP_PASS and server logs for details.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      mode: 'smtp',
      message: `Test email sent successfully to ${targetEmail}.`,
    });
  } catch (error) {
    next(error);
  }
};

// Sample content used to preview each feature's email template. Kept close to
// what the real trigger would actually say, so what the admin sees in their
// inbox matches production output — not a generic placeholder.
const FEATURE_TEST_SAMPLES: Record<EmailFeatureKey, { title: string; message: string }> = {
  NEW_MESSAGE: {
    title: 'New message from Jordan Lee',
    message: 'Jordan Lee: "Hey — do you have a minute to review the Q3 proposal before end of day?"',
  },
  GROUP_MESSAGE: {
    title: 'New message in #product-team',
    message: 'Sam Rivera mentioned you in #product-team: "@you can you confirm the launch date?"',
  },
  GROUP_CREATION: {
    title: "You've been added to Design Sync",
    message: 'Alex Chen added you to the group "Design Sync".',
  },
  TASK_ASSIGNED: {
    title: 'New task assigned to you',
    message: 'You were assigned the task "Finalize Q3 budget review" by Taylor Morgan. Due in 3 days.',
  },
  TASK_UPDATED: {
    title: 'Task updated: Finalize Q3 budget review',
    message: 'Taylor Morgan moved "Finalize Q3 budget review" to In Progress and updated the due date.',
  },
  ANNOUNCEMENT: {
    title: 'New Announcement: Office closed Monday',
    message: 'HR posted: "The office will be closed this Monday for the public holiday. Remote work is optional."',
  },
  MEETING_INVITE: {
    title: 'Meeting Invite: Weekly Sync',
    message: "You've been invited to \"Weekly Sync\" on Thursday at 10:00 AM by Morgan Lee.",
  },
  FILE_SHARED: {
    title: 'A file was shared with you',
    message: 'Casey Kim shared "Q3-Financial-Report.pdf" with you.',
  },
  BIRTHDAY_WISH: {
    title: '', // unused — birthday uses its own dedicated template, see below
    message: '',
  },
};

const FEATURE_LABELS: Record<EmailFeatureKey, string> = {
  NEW_MESSAGE: 'New Direct Message',
  GROUP_MESSAGE: 'Group Message & Mentions',
  GROUP_CREATION: 'Group Creation',
  TASK_ASSIGNED: 'Task Assigned',
  TASK_UPDATED: 'Task Updated',
  ANNOUNCEMENT: 'Announcement Posted',
  MEETING_INVITE: 'Meeting Invite',
  FILE_SHARED: 'File / Document Shared',
  BIRTHDAY_WISH: 'Birthday Wish',
};

/**
 * Sends a realistic sample of one specific feature's email template, so an
 * admin can verify each notification type individually — not just that SMTP
 * connectivity works in general (that's what sendTestEmail above is for).
 * Always sends regardless of the feature's current on/off toggle (it's an
 * explicit test action), but the response tells the admin if that feature is
 * currently disabled for real users, since that's easy to forget.
 */
export const sendFeatureTestEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { feature } = req.params;
    const targetEmail = (req.body?.to && String(req.body.to).trim()) || req.user?.email;

    if (!targetEmail) {
      res.status(400).json({ message: 'No target email address available.' });
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(FEATURE_TEST_SAMPLES, feature)) {
      res.status(400).json({ message: `Unknown email feature "${feature}".` });
      return;
    }
    const featureKey = feature as EmailFeatureKey;

    const orgSettings = await getOrganizationSettings();
    const orgName = orgSettings.orgName || 'ConnectHub';

    let subject: string, text: string, html: string;
    if (featureKey === 'BIRTHDAY_WISH') {
      const sample = buildBirthdayEmailHtml(req.user?.firstName || 'Alex', orgName);
      subject = sample.subject;
      text = sample.text;
      html = sample.html;
    } else {
      const sample = FEATURE_TEST_SAMPLES[featureKey];
      const built = buildNotificationEmail(sample.title, sample.message, orgName);
      subject = built.subject;
      text = built.text;
      html = built.html;
    }
    // Clearly mark it as a test so it's never mistaken for the real thing
    subject = `[TEST] ${subject}`;

    const result: any = await sendEmail(targetEmail, subject, text, html);
    const featureEnabled = await isEmailFeatureEnabled(featureKey);
    const label = FEATURE_LABELS[featureKey];

    if (result?.mode === 'not-configured') {
      res.status(200).json({
        success: false,
        mode: 'not-configured',
        message: 'SMTP is not configured (missing SMTP_USER/SMTP_PASS). The email was not actually sent.',
      });
      return;
    }

    if (result?.mode === 'fallback' || result?.success === false) {
      res.status(200).json({
        success: false,
        mode: 'fallback',
        message: `SMTP send failed: ${result?.error || 'unknown error'}.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      mode: 'smtp',
      message: featureEnabled
        ? `Sample "${label}" email sent to ${targetEmail}.`
        : `Sample "${label}" email sent to ${targetEmail}. Note: this feature is currently OFF for real users — toggle it on above if that's not intended.`,
      featureEnabled,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggregate system health snapshot for the admin System Health tab: DB, Redis,
 * SMTP, storage, realtime, memory, background job heartbeats, and recent error
 * rate — see health.service.ts for individual check logic.
 */
export const getSystemHealth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const io = req.app.get('io');
    const health = await getSystemHealthData(io);
    res.status(200).json(health);
  } catch (error) {
    next(error);
  }
};

/**
 * Sends a real sample alert to the configured webhook, using the current
 * live health snapshot, so an admin can confirm their webhook URL actually
 * works before relying on it during a real incident.
 */
export const sendTestHealthAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgSettings = await getOrganizationSettings();
    const webhookUrl = req.body?.webhookUrl || orgSettings.alertWebhookUrl;

    if (!webhookUrl) {
      res.status(400).json({ message: 'No alert webhook URL is configured. Add one and save before sending a test.' });
      return;
    }

    const io = req.app.get('io');
    const health = await getSystemHealthData(io);
    const sent = await sendWebhookAlert(webhookUrl, health, orgSettings.orgName || 'ConnectHub');

    if (sent) {
      res.status(200).json({ success: true, message: 'Test alert sent successfully.' });
    } else {
      res.status(200).json({ success: false, message: 'Could not reach the webhook URL. Check the URL and try again.' });
    }
  } catch (error) {
    next(error);
  }
};
