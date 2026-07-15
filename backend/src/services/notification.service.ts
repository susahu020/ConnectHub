import prisma from '../config/db';
import { sendEmail } from '../config/mailer';

interface NotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'MESSAGE' | 'ANNOUNCEMENT' | 'MENTION' | 'REMINDER' | 'SYSTEM';
  relatedId?: string;
  io?: any;
}

export const createNotification = async (params: NotificationParams) => {
  const { userId, title, message, type, relatedId, io } = params;

  try {
    // 1. Create DB notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        relatedId,
      },
    });

    // 2. Query user preferences
    const userWithSettings = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (userWithSettings) {
      // 3. Real-time WebSocket Broadcast
      if (io) {
        io.to(`user:${userId}`).emit('notification_received', notification);
      }

      // 4. Email Notification (if user has enabled it)
      const emailEnabled = userWithSettings.settings?.emailEnabled ?? true;
      if (emailEnabled && userWithSettings.email) {
        const emailSubject = `[ConnectHub] ${title}`;
        const emailText = `${message}\n\nThis is an automated notification from ConnectHub. You can manage your notification preferences in your User Settings.`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px;">
            <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">ConnectHub Notification</h2>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;">
            <p style="font-size: 15px; line-height: 1.6; font-weight: bold; color: #111;">${title}</p>
            <p style="font-size: 14px; line-height: 1.6; color: #555;">${message}</p>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;">
            <p style="font-size: 11px; color: #888; line-height: 1.5;">
              This is an automated notification from ConnectHub. To change how you receive these updates, visit your 
              <a href="http://localhost:3000/settings" style="color: #2563eb; text-decoration: none; font-weight: bold;">Account Settings</a>.
            </p>
          </div>
        `;
        
        // Dispatch email asynchronously
        sendEmail(userWithSettings.email, emailSubject, emailText, emailHtml).catch((err) => {
          console.error(`Mailer: Failed to send email to ${userWithSettings.email}:`, err);
        });
      }
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
    type: 'TASK_ASSIGNED' | 'MESSAGE' | 'ANNOUNCEMENT' | 'MENTION' | 'REMINDER' | 'SYSTEM';
    relatedId?: string;
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
