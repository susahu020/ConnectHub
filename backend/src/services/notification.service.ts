import prisma from '../config/db';
import { sendEmail } from '../config/mailer';
import { getOrgName } from './organization.service';

// Admin-controlled, per-feature email switches -----------------------------
//
// Each notification-triggering event in the app maps to one of these keys.
// The admin toggles them from Admin > Email Notifications; when a key is
// off, no email goes out for that feature, no matter what any individual
// user's personal "email notifications" preference is set to.
export type EmailFeatureKey =
  | 'NEW_MESSAGE'
  | 'GROUP_MESSAGE'
  | 'GROUP_CREATION'
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'ANNOUNCEMENT'
  | 'MEETING_INVITE'
  | 'FILE_SHARED'
  | 'BIRTHDAY_WISH';

const FEATURE_COLUMN_MAP: Record<EmailFeatureKey, string> = {
  NEW_MESSAGE: 'newMessageEmail',
  GROUP_MESSAGE: 'groupMessageEmail',
  GROUP_CREATION: 'groupCreationEmail',
  TASK_ASSIGNED: 'taskAssignedEmail',
  TASK_UPDATED: 'taskUpdatedEmail',
  ANNOUNCEMENT: 'announcementEmail',
  MEETING_INVITE: 'meetingInviteEmail',
  FILE_SHARED: 'fileSharedEmail',
  BIRTHDAY_WISH: 'birthdayWishEmail',
};

let cachedSettings: any | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

// Fetches the singleton EmailFeatureSettings row, creating it with the
// (all-enabled) defaults on first use. Cached briefly so the hot path of
// sending a notification doesn't hit the DB every single time; the cache is
// force-invalidated as soon as the admin saves a change (see
// invalidateEmailFeatureSettingsCache below), so updates take effect
// immediately rather than waiting out the TTL.
export const getEmailFeatureSettings = async () => {
  if (cachedSettings && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  let settings = await prisma.emailFeatureSettings.findFirst();
  if (!settings) {
    settings = await prisma.emailFeatureSettings.create({ data: {} });
  }

  cachedSettings = settings;
  cachedAt = Date.now();
  return settings;
};

export const invalidateEmailFeatureSettingsCache = () => {
  cachedSettings = null;
  cachedAt = 0;
};

export const isEmailFeatureEnabled = async (feature?: EmailFeatureKey): Promise<boolean> => {
  if (!feature) return true; // ungated features (e.g. future REMINDER emails) default to on
  const settings = await getEmailFeatureSettings();
  const column = FEATURE_COLUMN_MAP[feature];
  return settings[column] ?? true;
};

interface NotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'MESSAGE' | 'ANNOUNCEMENT' | 'MENTION' | 'REMINDER' | 'SYSTEM' | 'MEETING' | 'GROUP_CREATED';
  relatedId?: string;
  io?: any;
  // Which admin-controlled email feature this notification's email falls
  // under. Omit only for notification types that aren't gated by an admin
  // switch (the email will still respect the user's personal preference).
  emailFeature?: EmailFeatureKey;
}

// Reads UserSettings.notificationPreferences[type][channel], defaulting to
// true (enabled) when the user has no override for this category — so
// every existing user keeps getting everything they always got, and only
// someone who's actually visited Notification Preferences and turned a
// specific category+channel off will see it suppressed.
const resolveNotificationPreference = (
  notificationPreferences: unknown,
  type: string,
  channel: 'inApp' | 'email'
): boolean => {
  if (!notificationPreferences || typeof notificationPreferences !== 'object') return true;
  const categoryPrefs = (notificationPreferences as Record<string, any>)[type];
  if (!categoryPrefs || typeof categoryPrefs !== 'object') return true;
  return categoryPrefs[channel] !== false;
};

// Shared by real notification emails and the admin "send test email" tool
// (see admin.controller.ts sendFeatureTestEmail) so a test send shows the
// admin exactly what a real recipient's email looks like.
export const buildNotificationEmail = (title: string, message: string, orgName: string) => {
  const subject = `[${orgName}] ${title}`;
  const text = `${message}\n\nThis is an automated notification from ${orgName}. You can manage your notification preferences in your User Settings.`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">${orgName} Notification</h2>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;">
      <p style="font-size: 15px; line-height: 1.6; font-weight: bold; color: #111;">${title}</p>
      <p style="font-size: 14px; line-height: 1.6; color: #555;">${message}</p>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;">
      <p style="font-size: 11px; color: #888; line-height: 1.5;">
        This is an automated notification from ${orgName}. To change how you receive these updates, visit your 
        <a href="http://localhost:3000/settings" style="color: #2563eb; text-decoration: none; font-weight: bold;">Account Settings</a>.
      </p>
    </div>
  `;
  return { subject, text, html };
};

export const createNotification = async (params: NotificationParams) => {
  const { userId, title, message, type, relatedId, io, emailFeature } = params;

  try {
    // 1. Query user preferences first — a category the user has fully
    // muted (Notification Preferences > In-app off) shouldn't even create a
    // history row, not just skip the live push.
    const userWithSettings = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    if (!userWithSettings) return null;

    const categoryInAppEnabled = resolveNotificationPreference(userWithSettings.settings?.notificationPreferences, type, 'inApp');
    if (!categoryInAppEnabled) return null;

    // 2. Create DB notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        relatedId,
      },
    });

    // 3. Real-time WebSocket push — a separate, lighter-weight switch than
    // full suppression above: pushEnabled (Settings > Alert Channels) means
    // "don't interrupt me live", while still leaving the notification in
    // their history to check later. (Previously unused — nothing actually
    // read this field, so turning it off did nothing.)
    if (io && (userWithSettings.settings?.pushEnabled ?? true)) {
      io.to(`user:${userId}`).emit('notification_received', notification);
    }

    // 4. Email Notification (only if the user hasn't opted out at the
    // channel level, the category level, AND the admin hasn't disabled this
    // feature's emails platform-wide)
    const userWantsEmail = userWithSettings.settings?.emailEnabled ?? true;
    const categoryEmailEnabled = resolveNotificationPreference(userWithSettings.settings?.notificationPreferences, type, 'email');
    const adminAllowsEmail = await isEmailFeatureEnabled(emailFeature);
    const emailEnabled = userWantsEmail && categoryEmailEnabled && adminAllowsEmail;
    if (emailEnabled && userWithSettings.email) {
      const orgName = await getOrgName();
      const { subject: emailSubject, text: emailText, html: emailHtml } = buildNotificationEmail(title, message, orgName);

      // Dispatch email asynchronously
      sendEmail(userWithSettings.email, emailSubject, emailText, emailHtml).catch((err) => {
        console.error(`Mailer: Failed to send email to ${userWithSettings.email}:`, err);
      });
    }

    return notification;
  } catch (error) {
    console.error('Notification Service Error:', error);
    throw error;
  }
};

interface MultipleNotificationsParams {
  notifications: {
    userId: string;
    title: string;
    message: string;
    type: 'TASK_ASSIGNED' | 'MESSAGE' | 'ANNOUNCEMENT' | 'MENTION' | 'REMINDER' | 'SYSTEM' | 'MEETING' | 'GROUP_CREATED';
    relatedId?: string;
    emailFeature?: EmailFeatureKey;
  }[];
  io?: any;
}

export const createManyNotifications = async (params: MultipleNotificationsParams) => {
  const { notifications, io } = params;
  try {
    const results = await Promise.all(
      notifications.map((notif) =>
        createNotification({
          ...notif,
          io,
        })
      )
    );
    return results;
  } catch (error) {
    console.error('Notification Service createMany Error:', error);
    throw error;
  }
};
