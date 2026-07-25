import prisma from '../config/db';
import { sendEmail } from '../config/mailer';
import { getOrgName } from './organization.service';
import { isEmailFeatureEnabled } from './notification.service';

/**
 * A distinct, festive template for birthday wishes — deliberately not routed
 * through notification.service.ts's generic "[Org] Title" wrapper, since a
 * birthday email is meant to feel personal/celebratory rather than like a
 * routine system notification. Exported so the admin "send test email" tool
 * (see admin.controller.ts sendFeatureTestEmail) can preview the exact same
 * template a real recipient gets.
 */
export const buildBirthdayEmailHtml = (firstName: string, orgName: string) => {
  const subject = `🎉 Happy Birthday, ${firstName}!`;
  const text = `Happy Birthday, ${firstName}!\n\nWishing you a fantastic day filled with joy and celebration. Thank you for being a valued part of the ${orgName} team!\n\n— The ${orgName} Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 28px; border: 1px solid #f1d9ec; border-radius: 16px; background: linear-gradient(135deg, #fdf2f8 0%, #eef2ff 100%);">
      <div style="text-align: center; font-size: 42px; line-height: 1;">🎉🎂🎈</div>
      <h1 style="text-align: center; color: #a21caf; font-size: 24px; margin: 16px 0 4px;">Happy Birthday, ${firstName}!</h1>
      <p style="text-align: center; color: #64748b; font-size: 13px; margin: 0 0 24px;">from everyone at ${orgName}</p>
      <p style="font-size: 14px; line-height: 1.7; color: #334155;">
        Wishing you a fantastic day filled with joy, laughter, and celebration.
        Thank you for everything you bring to the team — we hope you have a wonderful year ahead!
      </p>
      <p style="font-size: 14px; line-height: 1.7; color: #334155; margin-top: 16px;">
        🎁 Your colleagues can drop you a note on the Recognition &amp; Celebrations board —
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/hr" style="color: #a21caf; font-weight: bold; text-decoration: none;">check it out</a>.
      </p>
      <hr style="border: 0; border-top: 1px solid #f1d9ec; margin: 24px 0;">
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">
        Sent automatically by ${orgName} on your birthday. An admin can turn this off in Admin &gt; Email Notifications.
      </p>
    </div>
  `;
  return { subject, text, html };
};

/**
 * Sends the birthday email to one user, respecting both the admin's platform-wide
 * toggle (birthdayWishEmail) and the user's personal email-notification preference
 * — same two gates every other notification email goes through. Also creates an
 * in-app notification and a real-time bell alert, so the birthday shows up even
 * for someone who has email notifications turned off.
 */
export const sendBirthdayWishToUser = async (
  user: { id: string; firstName: string; email: string },
  io?: any
): Promise<{ sent: boolean; reason?: string }> => {
  const orgName = await getOrgName();

  // In-app notification + real-time bell — independent of the email toggle,
  // so everyone gets a birthday acknowledgment somewhere even if email is off.
  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      title: `🎉 Happy Birthday, ${user.firstName}!`,
      message: `Wishing you a wonderful birthday from everyone at ${orgName}!`,
      type: 'SYSTEM',
    },
  });
  if (io) {
    io.to(`user:${user.id}`).emit('notification_received', notification);
  }

  const adminAllowsEmail = await isEmailFeatureEnabled('BIRTHDAY_WISH');
  if (!adminAllowsEmail) {
    return { sent: false, reason: 'Birthday emails are disabled platform-wide (Admin > Email Notifications).' };
  }

  const userSettings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  const userWantsEmail = userSettings?.emailEnabled ?? true;
  if (!userWantsEmail) {
    return { sent: false, reason: 'This user has personal email notifications turned off.' };
  }

  if (!user.email) {
    return { sent: false, reason: 'User has no email address on file.' };
  }

  const { subject, text, html } = buildBirthdayEmailHtml(user.firstName, orgName);
  await sendEmail(user.email, subject, text, html).catch((err) => {
    console.error(`Mailer: Failed to send birthday email to ${user.email}:`, err);
  });

  return { sent: true };
};

/**
 * Daily scan: finds every user whose birthday (month + day) is today and sends
 * them the wish, skipping anyone already wished this year. Designed to be called
 * from a periodic interval (see index.ts) rather than a precise midnight cron —
 * the "already wished this year" check makes it safe to call more than once a
 * day without double-sending.
 */
export const runDailyBirthdayCheck = async (io?: any): Promise<{ checked: number; sent: number }> => {
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDate = today.getDate();
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const allUsers = await prisma.user.findMany({
    where: { birthday: { not: null } },
    select: { id: true, firstName: true, email: true, birthday: true },
  });

  const todaysBirthdays = allUsers.filter((u) => {
    const b = new Date(u.birthday!);
    return b.getMonth() + 1 === todayMonth && b.getDate() === todayDate;
  });

  let sentCount = 0;
  for (const user of todaysBirthdays) {
    // Dedup: has this user already received a birthday wish notification this year?
    const alreadyWished = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: 'SYSTEM',
        title: { startsWith: '🎉 Happy Birthday' },
        createdAt: { gte: yearStart },
      },
    });
    if (alreadyWished) continue;

    const result = await sendBirthdayWishToUser(user, io);
    if (result.sent) sentCount++;
  }

  return { checked: todaysBirthdays.length, sent: sentCount };
};
