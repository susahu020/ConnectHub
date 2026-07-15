import 'dotenv/config';
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

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

import prisma from './config/db';

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
app.use(morgan('dev'));
app.use(securityHeaders);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists and serve static files from it
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/v1', apiRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Error handling middleware
app.use(errorHandler as any);

// Background worker for scheduled messages delivery
setInterval(async () => {
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
  } catch (err) {
    console.error('Error in scheduled messages worker:', err);
  }
}, 10000); // Check every 10 seconds

// Due Date Reminders Background Scanner (Runs every 10 minutes)
setInterval(async () => {
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
      }
    }
  } catch (err) {
    console.error('Failed to run due date reminders scan:', err);
  }
}, 10 * 60 * 1000); // Check every 10 minutes

// Listen on all network interfaces
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`ConnectHub Enterprise Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Local Static Uploads Path: ${uploadDir}`);
  console.log(`==================================================`);
});

export default server;
