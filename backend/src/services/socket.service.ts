import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-local-jwt-access-secret-123456';

// Store online sockets (userId -> Socket IDs list)
export const activeConnections = new Map<string, string[]>();
// Store active devices per user
export const activeDevices = new Map<string, { socketId: string; device: string }[]>();

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware for socket connections
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication failed. No token.'));
      }

      const decoded = jwt.verify(token, ACCESS_SECRET) as { id: string; email: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (!user) {
        return next(new Error('User not found.'));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;
    const userId = user.id;

    // Parse user agent to identify active device
    const userAgent = socket.handshake.headers['user-agent'] || '';
    let device = 'Web';
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      device = 'Mobile';
    } else if (/electron|desktop/i.test(userAgent)) {
      device = 'Desktop';
    }

    console.log(`Socket Connected: User ${user.firstName} ${user.lastName} (${userId}) on ${device}`);

    // Track active connection and device
    if (activeConnections.has(userId)) {
      activeConnections.get(userId)!.push(socket.id);
    } else {
      activeConnections.set(userId, [socket.id]);
    }

    if (!activeDevices.has(userId)) {
      activeDevices.set(userId, [{ socketId: socket.id, device }]);
    } else {
      activeDevices.get(userId)!.push({ socketId: socket.id, device });
    }

    // Join personal user room (useful for direct notifications/messages)
    socket.join(`user:${userId}`);

    // Get current status from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true }
    });

    let currentStatus = dbUser?.status || 'ONLINE';
    // When establishing the first active socket connection (fresh login), automatically force status to ONLINE
    const isFirstConnection = (activeConnections.get(userId)?.length || 0) === 1;
    if (isFirstConnection) {
      currentStatus = 'ONLINE';
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'ONLINE' },
      });
    }

    // Broadcast presence update (mask INVISIBLE to OFFLINE for other users)
    const broadcastStatus = currentStatus === 'INVISIBLE' ? 'OFFLINE' : currentStatus;
    const userDevices = activeDevices.get(userId)?.map(d => d.device) || [];

    io.emit('presence', { 
      userId, 
      status: broadcastStatus,
      devices: userDevices,
      lastSeen: new Date()
    });

    // Join all user group chat rooms
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    
    for (const membership of memberships) {
      socket.join(`group:${membership.groupId}`);
    }

    // ----------------------------------------------------
    // PRESENCE UPDATE EVENT
    // ----------------------------------------------------
    socket.on('update_presence', async ({ status }) => {
      const validStatuses = ['ONLINE', 'AWAY', 'BUSY', 'DND', 'OFFLINE', 'INVISIBLE'];
      if (!validStatuses.includes(status)) return;

      await prisma.user.update({
        where: { id: userId },
        data: { 
          status,
          lastSeen: new Date()
        },
      });

      const broadcastStatus = status === 'INVISIBLE' ? 'OFFLINE' : status;
      const userDevices = activeDevices.get(userId)?.map(d => d.device) || [];

      io.emit('presence', { 
        userId, 
        status: broadcastStatus,
        devices: userDevices,
        lastSeen: new Date()
      });
    });

    // ----------------------------------------------------
    // CHAT EVENTS
    // ----------------------------------------------------
    socket.on('typing', ({ contactId, groupId }) => {
      if (contactId) {
        io.to(`user:${contactId}`).emit('typing', { senderId: userId, groupId: null });
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit('typing', { senderId: userId, groupId });
      }
    });

    socket.on('stop_typing', ({ contactId, groupId }) => {
      if (contactId) {
        io.to(`user:${contactId}`).emit('stop_typing', { senderId: userId, groupId: null });
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit('stop_typing', { senderId: userId, groupId });
      }
    });

    socket.on('message', (message) => {
      // Broadcast new message to recipient or group
      if (message.receiverId) {
        // Direct Message
        io.to(`user:${message.receiverId}`).emit('message', message);
        io.to(`user:${userId}`).emit('message', message); // send back to sender's other sockets
      } else if (message.groupId) {
        // Group Message
        io.to(`group:${message.groupId}`).emit('message', message);
      }
    });

    socket.on('read_receipt', async ({ messageId, senderId }) => {
      try {
        await prisma.messageStatus.updateMany({
          where: { messageId, userId },
          data: { status: 'READ', readAt: new Date() },
        });

        // Notify sender that message has been read
        io.to(`user:${senderId}`).emit('message_read', { messageId, userId });
      } catch (err) {
        console.error('Error handling read receipt:', err);
      }
    });

    // ----------------------------------------------------
    // NOTIFICATION & BOARD EVENTS
    // ----------------------------------------------------
    socket.on('join_project', (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('leave_project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    // ----------------------------------------------------
    // DISCONNECTION
    // ----------------------------------------------------
    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: Socket ID ${socket.id} (User: ${userId})`);

      const sockets = activeConnections.get(userId) || [];
      const updatedSockets = sockets.filter((id) => id !== socket.id);

      const devices = activeDevices.get(userId) || [];
      const updatedDevices = devices.filter((d) => d.socketId !== socket.id);

      if (updatedSockets.length > 0) {
        activeConnections.set(userId, updatedSockets);
        activeDevices.set(userId, updatedDevices);
      } else {
        // No active connections left for user, mark offline
        activeConnections.delete(userId);
        activeDevices.delete(userId);

        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { status: true }
        });

        const isInvisible = dbUser?.status === 'INVISIBLE';

        await prisma.user.update({
          where: { id: userId },
          data: { 
            status: isInvisible ? 'INVISIBLE' : 'OFFLINE',
            lastSeen: new Date()
          },
        });

        // Broadcast offline status
        io.emit('presence', { 
          userId, 
          status: 'OFFLINE',
          devices: [],
          lastSeen: new Date()
        });
      }
    });
  });

  return io;
};
