import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-local-jwt-access-secret-123456';

// Store online sockets (userId -> Socket IDs list)
export const activeConnections = new Map<string, string[]>();
// Store active devices per user
export const activeDevices = new Map<string, { socketId: string; device: string }[]>();

// Store active participants in meeting rooms: meetingId -> Array of participant details
interface MeetingParticipantInfo {
  socketId: string;
  userId: string;
  name: string;
  role: string;
  isMuted: boolean;
  videoOn: boolean;
  avatar: string;
  isHandRaised?: boolean;
}
export const meetingParticipants = new Map<string, MeetingParticipantInfo[]>();

// Store active/started meetings: meetingId
export const activeMeetings = new Set<string>();

// Store meetingId -> hostUserId, set when the host starts the meeting.
// This lets us notify the host directly (via their personal user:<id> room)
// even if their socket has not (yet) joined the meeting_room for that meetingId.
export const meetingHosts = new Map<string, string>();

// Meetings the host has locked — no new join requests are accepted while locked.
export const lockedMeetings = new Set<string>();

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
    // MEETING WORKSPACE REAL-TIME EVENTS
    // ----------------------------------------------------
    socket.on('join_meeting_lobby', ({ meetingId }) => {
      socket.join(`meeting_lobby:${meetingId}`);
      console.log(`Socket joined meeting lobby: ${meetingId} (User: ${userId})`);
      
      // Latecomer lobby synchronization: If the host has already started, notify the latecomer immediately
      if (activeMeetings.has(meetingId)) {
        socket.emit('meeting_started', { meetingId });
        console.log(`Latecomer lobby check: Meeting ${meetingId} is already active. Notifying guest socket ${socket.id}.`);
      }
    });

    socket.on('start_meeting', ({ meetingId }) => {
      activeMeetings.add(meetingId);
      meetingHosts.set(meetingId, userId);
      io.to(`meeting_lobby:${meetingId}`).emit('meeting_started', { meetingId });
      console.log(`Meeting started by host: ${meetingId}`);
    });

    socket.on('request_to_join_meeting', async ({ meetingId, guestName }) => {
      if (lockedMeetings.has(meetingId)) {
        socket.emit('meeting_admission_result', { admit: false, meetingId, locked: true });
        return;
      }
      const payload = {
        meetingId,
        guestId: userId,
        guestName,
        socketId: socket.id
      };

      // 1) Broadcast to anyone already inside the live meeting_room (covers the host's
      //    active tab instantly, no DB round-trip needed).
      socket.to(`meeting_room:${meetingId}`).emit('guest_request_to_join', payload);

      // 2) ALSO notify the host directly by their user id. This is the fix for
      //    "admin not get notification": relying only on the meeting_room broadcast
      //    above fails whenever the host's socket hasn't joined that room yet (e.g.
      //    slow network, host on a different tab/page, host reconnected). Since every
      //    socket joins `user:<id>` on connect (see below), this reaches the host
      //    regardless of which page they're on.
      const hostUserId = meetingHosts.get(meetingId);
      if (hostUserId && hostUserId !== userId) {
        io.to(`user:${hostUserId}`).emit('guest_request_to_join', payload);

        try {
          const notification = await prisma.notification.create({
            data: {
              userId: hostUserId,
              title: 'Meeting join request',
              message: `${guestName} is asking to join your meeting (${meetingId}).`,
              type: 'MEETING',
              relatedId: meetingId,
            },
          });
          // Push it live so the notification bell updates immediately, not just on next fetch.
          io.to(`user:${hostUserId}`).emit('notification_received', notification);
        } catch (err) {
          console.error('Failed to persist meeting join-request notification:', err);
        }
      }

      console.log(`Guest ${guestName} requested to join meeting ${meetingId}`);
    });

    socket.on('admit_meeting_guest', ({ meetingId, guestSocketId, admit }) => {
      // Send the decision directly to the guest's socket
      io.to(guestSocketId).emit('meeting_admission_result', { admit, meetingId });
      console.log(`Host decision for guest socket ${guestSocketId} in ${meetingId}: ${admit ? 'ADMITTED' : 'DENIED'}`);
    });

    // Host-only moderation actions. All three trust the caller only if the
    // server's own record says they're the host of this meetingId — the
    // client's local isHost flag is a UI convenience, not authorization.
    const assertIsHost = (meetingId: string) => meetingHosts.get(meetingId) === userId;

    socket.on('toggle_meeting_lock', ({ meetingId, locked }) => {
      if (!assertIsHost(meetingId)) return;
      if (locked) lockedMeetings.add(meetingId);
      else lockedMeetings.delete(meetingId);
      io.to(`meeting_room:${meetingId}`).emit('meeting_lock_changed', { locked });
    });

    socket.on('force_mute_participant', ({ meetingId, targetSocketId }) => {
      if (!assertIsHost(meetingId)) return;
      io.to(targetSocketId).emit('force_muted');
    });

    socket.on('remove_participant', ({ meetingId, targetSocketId }) => {
      if (!assertIsHost(meetingId)) return;
      const list = meetingParticipants.get(meetingId);
      if (list) {
        meetingParticipants.set(meetingId, list.filter(p => p.socketId !== targetSocketId));
      }
      io.to(targetSocketId).emit('removed_from_meeting');
      socket.to(`meeting_room:${meetingId}`).emit('participant_left', { socketId: targetSocketId });
    });

    socket.on('join_meeting_room', ({ meetingId }) => {
      socket.join(`meeting_room:${meetingId}`);
      
      const newParticipant: MeetingParticipantInfo = {
        socketId: socket.id,
        userId: userId,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        isMuted: false,
        videoOn: true,
        avatar: `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}`,
        isHandRaised: false
      };

      if (!meetingParticipants.has(meetingId)) {
        meetingParticipants.set(meetingId, []);
      }
      
      const list = meetingParticipants.get(meetingId)!;
      if (!list.some(p => p.socketId === socket.id)) {
        list.push(newParticipant);
      }

      // Send the currently active participants inside the room to the newly joined client
      socket.emit('meeting_active_participants', list);

      // Broadcast entry to other participants
      socket.to(`meeting_room:${meetingId}`).emit('participant_joined', newParticipant);
      console.log(`Participant ${user.firstName} joined meeting room: ${meetingId}`);
    });

    socket.on('leave_meeting_room', ({ meetingId }) => {
      socket.leave(`meeting_room:${meetingId}`);
      
      if (meetingParticipants.has(meetingId)) {
        const list = meetingParticipants.get(meetingId)!;
        const updatedList = list.filter(p => p.socketId !== socket.id);
        if (updatedList.length === 0) {
          meetingParticipants.delete(meetingId);
          activeMeetings.delete(meetingId); // Clear active meeting status
          meetingHosts.delete(meetingId);
          lockedMeetings.delete(meetingId);
        } else {
          meetingParticipants.set(meetingId, updatedList);
        }
      }

      socket.to(`meeting_room:${meetingId}`).emit('participant_left', { id: userId, socketId: socket.id });
      console.log(`Participant ${user.firstName} left meeting room: ${meetingId}`);
    });

    socket.on('send_meeting_message', ({ meetingId, content }) => {
      const chatMsg = {
        senderId: userId,
        sender: `${user.firstName} ${user.lastName}`,
        content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      // Broadcast chat message to everyone in the room
      io.to(`meeting_room:${meetingId}`).emit('meeting_chat_message', chatMsg);
      console.log(`Meeting Chat: ${user.firstName} in ${meetingId}: ${content}`);
    });

    socket.on('update_media_state', ({ meetingId, isMuted, videoOn, isHandRaised }) => {
      if (meetingParticipants.has(meetingId)) {
        const list = meetingParticipants.get(meetingId)!;
        const p = list.find(p => p.socketId === socket.id);
        if (p) {
          p.isMuted = isMuted ?? p.isMuted;
          p.videoOn = videoOn ?? p.videoOn;
          p.isHandRaised = isHandRaised ?? p.isHandRaised;
        }
      }
      
      socket.to(`meeting_room:${meetingId}`).emit('participant_media_state_changed', {
        id: userId,
        socketId: socket.id,
        isMuted,
        videoOn,
        isHandRaised
      });
    });

    socket.on('draw_stroke', ({ meetingId, x, y, lastX, lastY, color, size, tool }) => {
      socket.to(`meeting_room:${meetingId}`).emit('draw_stroke', { x, y, lastX, lastY, color, size, tool });
    });

    socket.on('clear_whiteboard', ({ meetingId }) => {
      socket.to(`meeting_room:${meetingId}`).emit('clear_whiteboard');
    });

    // Recording consent notice — broadcast to everyone in the room the moment
    // the host starts/stops, mirroring Meet/Teams' "this meeting is being recorded" banner.
    socket.on('recording_state', ({ meetingId, recording }) => {
      socket.to(`meeting_room:${meetingId}`).emit('meeting_recording_state_changed', {
        recording,
        byName: `${user.firstName} ${user.lastName}`,
      });
    });

    socket.on('send_reaction', ({ meetingId, reaction }) => {
      socket.to(`meeting_room:${meetingId}`).emit('reaction_received', {
        userId,
        senderName: `${user.firstName} ${user.lastName}`,
        reaction
      });
    });

    // Broadcasts that this socket has started/stopped sharing their screen, so
    // every other participant can tell a screen track apart from a camera track
    // without guessing (WebRTC gives no built-in "this is a screen" signal).
    socket.on('screen_share_state', ({ meetingId, sharing }) => {
      socket.to(`meeting_room:${meetingId}`).emit('peer_screen_share_changed', {
        socketId: socket.id,
        userId,
        name: `${user.firstName} ${user.lastName}`,
        sharing,
      });
    });

    // Non-host participant asks the host for permission to present their screen.
    socket.on('request_screen_share_permission', ({ meetingId, guestName }) => {
      const hostUserId = meetingHosts.get(meetingId);
      const payload = { meetingId, guestId: userId, guestName, socketId: socket.id };
      // Broadcast to the room (covers the host's active tab) and, for the same
      // reliability reason as join requests, target the host's user room too.
      socket.to(`meeting_room:${meetingId}`).emit('screen_share_permission_requested', payload);
      if (hostUserId && hostUserId !== userId) {
        io.to(`user:${hostUserId}`).emit('screen_share_permission_requested', payload);
      }
    });

    // Host's decision, routed back to just the requesting guest.
    socket.on('screen_share_permission_result', ({ targetSocketId, approved }) => {
      io.to(targetSocketId).emit('screen_share_permission_result', { approved });
    });

    // WebRTC signaling relay to target peer
    socket.on('webrtc_signal', ({ targetSocketId, signal }) => {
      io.to(targetSocketId).emit('webrtc_signal', {
        senderSocketId: socket.id,
        signal
      });
    });

    // Terminate meeting for all participants
    socket.on('end_meeting', ({ meetingId }) => {
      meetingParticipants.delete(meetingId);
      activeMeetings.delete(meetingId);
      meetingHosts.delete(meetingId);
          lockedMeetings.delete(meetingId);
      io.to(`meeting_room:${meetingId}`).emit('meeting_ended');
      console.log(`Meeting ${meetingId} terminated for all participants by Host.`);
    });

    // ----------------------------------------------------
    // DISCONNECTION
    // ----------------------------------------------------
    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: Socket ID ${socket.id} (User: ${userId})`);

      // Cleanup user from all meeting rooms
      meetingParticipants.forEach((list, meetingId) => {
        const index = list.findIndex(p => p.socketId === socket.id);
        if (index !== -1) {
          list.splice(index, 1);
          if (list.length === 0) {
            meetingParticipants.delete(meetingId);
            activeMeetings.delete(meetingId); // Clear active meeting status
            meetingHosts.delete(meetingId);
            lockedMeetings.delete(meetingId);
          } else {
            meetingParticipants.set(meetingId, list);
          }
          socket.to(`meeting_room:${meetingId}`).emit('participant_left', { id: userId, socketId: socket.id });
          console.log(`Cleanup: Participant ${user.firstName} left meeting room ${meetingId} on socket disconnect.`);
        }
      });

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
