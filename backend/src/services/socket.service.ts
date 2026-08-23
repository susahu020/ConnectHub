import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

// meetingId -> Set of co-host user ids, mirrored from Meeting.coHostIds (the
// DB row is the source of truth; this is just a fast in-memory cache
// populated on 'start_meeting' and kept current by 'update_co_hosts' so every
// moderation-action handler below doesn't need a DB round trip per call).
export const meetingCoHosts = new Map<string, Set<string>>();

// meetingId -> Set of banned user ids, mirrored from Meeting.bannedUserIds
// the same way. Checked the moment a join/admission request comes in, before
// the host is ever bothered with a request from someone they already removed.
export const meetingBans = new Map<string, Set<string>>();

interface ActivePoll {
  id: string;
  question: string;
  options: string[];
  votes: Map<string, number>; // userId -> option index
  createdBy: string;
}
// meetingId -> Map of pollId -> poll. Ephemeral like the rest of in-call
// state (reactions, whiteboard strokes) — polls aren't meant to be a
// permanent record, only a live-in-the-room activity, so nothing here is
// persisted to the database.
export const meetingPolls = new Map<string, Map<string, ActivePoll>>();

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
      const validStatuses = ['ONLINE', 'AWAY', 'BUSY', 'DND', 'OFFLINE', 'INVISIBLE', 'IN_MEETING', 'ON_LEAVE'];
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

    // Frontend emits this whenever a group chat is opened (see groups/page.tsx),
    // to cover a group the user was just added to (or just created) during the
    // current session — the group-room joins above only run once, at connect
    // time, from the membership list as of that moment. Without this handler
    // the emit was a silent no-op: the socket would never join `group:<id>`
    // for a group created/joined after connect, so that user would receive no
    // realtime messages in it until their next reconnect/refresh.
    socket.on('join_room', async ({ roomId }: { roomId: string }) => {
      const membership = await prisma.groupMember.findFirst({
        where: { groupId: roomId, userId },
        select: { id: true },
      });
      if (membership) {
        socket.join(`group:${roomId}`);
      }
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

    socket.on('start_meeting', async ({ meetingId }) => {
      // This is what actually flips a meeting live for every guest waiting in
      // the lobby, so it needs the same host-or-co-host check as any other
      // moderation action — without it, any authenticated socket that knew
      // the meeting code could register itself as host in meetingHosts below.
      let meeting;
      try {
        meeting = await prisma.meeting.findUnique({ where: { code: meetingId } });
      } catch (err) {
        console.error('Failed to look up meeting for start_meeting authorization:', err);
        return;
      }
      if (!meeting || (meeting.hostId !== userId && !meeting.coHostIds.includes(userId))) return;

      activeMeetings.add(meetingId);
      meetingHosts.set(meetingId, meeting.hostId);
      // Warm the co-host/ban caches from the DB right away rather than
      // waiting for the first moderation action or join request to trigger
      // the self-heal lookups — otherwise the very first request-to-join of
      // the call could briefly miss a ban that was set before this restart.
      meetingCoHosts.set(meetingId, new Set(meeting.coHostIds || []));
      meetingBans.set(meetingId, new Set(meeting.bannedUserIds || []));
      io.to(`meeting_lobby:${meetingId}`).emit('meeting_started', { meetingId });
      console.log(`Meeting started: ${meetingId} (by ${meeting.hostId === userId ? 'host' : 'co-host'} ${userId})`);
    });

    // Every participant joins this persistent, meeting-wide channel for the entire
    // duration of the call (separate from `meeting_room:<roomKey>`, which is scoped
    // to whichever specific room — main or a breakout room — they're currently in).
    // Host controls that must reach everyone regardless of which breakout room
    // they're in (end meeting, lock, recording notice, breakout room updates) use
    // this channel instead.
    socket.on('join_meeting_channel', ({ meetingId }) => {
      socket.join(`meeting:${meetingId}`);
    });

    socket.on('leave_meeting_channel', ({ meetingId }) => {
      socket.leave(`meeting:${meetingId}`);
    });

    socket.on('request_to_join_meeting', async ({ meetingId, guestName }) => {
      if (lockedMeetings.has(meetingId)) {
        socket.emit('meeting_admission_result', { admit: false, meetingId, locked: true });
        return;
      }
      // Defense-in-depth: the REST getMeetingByCode lookup already blocks a
      // banned user before they ever reach the waiting screen, but a client
      // could in principle skip straight to this socket event, so the ban is
      // enforced here too rather than trusted to have been checked upstream.
      let banSet = meetingBans.get(meetingId);
      if (!banSet) {
        try {
          const meeting = await prisma.meeting.findUnique({ where: { code: meetingId } });
          banSet = new Set(meeting?.bannedUserIds || []);
          meetingBans.set(meetingId, banSet);
        } catch (err) {
          console.error('Failed to look up bans before admitting a join request:', err);
          banSet = new Set();
        }
      }
      if (banSet.has(userId)) {
        socket.emit('meeting_admission_result', { admit: false, meetingId, banned: true });
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
      let hostUserId = meetingHosts.get(meetingId);

      // meetingHosts is an in-process Map — it's empty after every server restart
      // (e.g. nodemon reloading on a file save) and can also lag a beat behind the
      // host's REST call if their 'start_meeting' socket emit hasn't landed yet.
      // Fall back to the durable DB record (Meeting.hostId) so a join request is
      // never silently dropped just because in-memory state hasn't caught up.
      if (!hostUserId) {
        try {
          const meeting = await prisma.meeting.findUnique({ where: { code: meetingId } });
          if (meeting?.hostId) {
            hostUserId = meeting.hostId;
            meetingHosts.set(meetingId, hostUserId); // self-heal for subsequent requests
            activeMeetings.add(meetingId);
          }
        } catch (err) {
          console.error('Failed to look up meeting host as a fallback:', err);
        }
      }

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

    // Host-only moderation actions. All of these trust the caller only if the
    // server's own record says they're the host of this meetingId — the
    // client's local isHost flag is a UI convenience, not authorization.
    // Falls back to the DB (Meeting.hostId) and self-heals the in-memory map
    // when it's empty — same reasoning as the join-request fallback above.
    const assertIsHost = async (meetingId: string): Promise<boolean> => {
      if (meetingHosts.get(meetingId) === userId) return true;
      if (meetingHosts.has(meetingId)) return false; // known host, and it's not this user

      try {
        const meeting = await prisma.meeting.findUnique({ where: { code: meetingId } });
        if (meeting?.hostId === userId) {
          meetingHosts.set(meetingId, userId);
          activeMeetings.add(meetingId);
          return true;
        }
      } catch (err) {
        console.error('Failed to look up meeting host for authorization:', err);
      }
      return false;
    };

    // Loads (and caches) the co-host set for a meeting straight from the DB
    // the first time it's needed in this process — same self-heal pattern as
    // assertIsHost, since meetingCoHosts is normally populated proactively on
    // 'start_meeting' but won't be if the server restarted mid-call.
    const getCoHostSet = async (meetingId: string): Promise<Set<string>> => {
      let set = meetingCoHosts.get(meetingId);
      if (set) return set;
      try {
        const meeting = await prisma.meeting.findUnique({ where: { code: meetingId } });
        set = new Set(meeting?.coHostIds || []);
      } catch (err) {
        console.error('Failed to look up co-hosts for authorization:', err);
        set = new Set();
      }
      meetingCoHosts.set(meetingId, set);
      return set;
    };

    // Co-hosts (Meet "co-host" / Teams "co-organizer") get every in-call
    // moderation power the host has — this is the gate every one of those
    // actions uses below, instead of assertIsHost alone.
    const assertIsHostOrCoHost = async (meetingId: string): Promise<boolean> => {
      if (await assertIsHost(meetingId)) return true;
      const coHosts = await getCoHostSet(meetingId);
      return coHosts.has(userId);
    };

    const getBanSet = async (meetingId: string): Promise<Set<string>> => {
      let set = meetingBans.get(meetingId);
      if (set) return set;
      try {
        const meeting = await prisma.meeting.findUnique({ where: { code: meetingId } });
        set = new Set(meeting?.bannedUserIds || []);
      } catch (err) {
        console.error('Failed to look up bans for authorization:', err);
        set = new Set();
      }
      meetingBans.set(meetingId, set);
      return set;
    };

    socket.on('admit_meeting_guest', async ({ meetingId, guestSocketId, admit }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      // Send the decision directly to the guest's socket
      io.to(guestSocketId).emit('meeting_admission_result', { admit, meetingId });
      console.log(`Host decision for guest socket ${guestSocketId} in ${meetingId}: ${admit ? 'ADMITTED' : 'DENIED'}`);
    });

    socket.on('toggle_meeting_lock', async ({ meetingId, locked }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      if (locked) lockedMeetings.add(meetingId);
      else lockedMeetings.delete(meetingId);
      io.to(`meeting:${meetingId}`).emit('meeting_lock_changed', { locked });
    });

    // Host/co-host creates/renames/removes breakout rooms. `rooms` is the full
    // desired list (excluding "main", which always implicitly exists);
    // broadcasting the whole list keeps every client's room picker in sync
    // without diffing client-side.
    socket.on('update_breakout_rooms', async ({ meetingId, rooms }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      io.to(`meeting:${meetingId}`).emit('breakout_rooms_updated', { rooms });
    });

    // Host/co-host closes all breakout rooms — every participant currently in
    // one gets moved back to the main room automatically.
    socket.on('close_breakout_rooms', async ({ meetingId }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      io.to(`meeting:${meetingId}`).emit('breakout_rooms_closed');
    });

    socket.on('force_mute_participant', async ({ meetingId, room, targetSocketId }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      io.to(targetSocketId).emit('force_muted');
    });

    // "Mute all" — mutes every current participant in the room in one action
    // (Meet/Teams both have this for large calls), except the caller
    // themself. Participants can still unmute themselves afterward — this
    // isn't a lock, just a bulk version of force_mute_participant.
    socket.on('mute_all_participants', async ({ meetingId, room }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      const roomKey = room || meetingId;
      const list = meetingParticipants.get(roomKey) || [];
      list.forEach((p) => {
        if (p.socketId !== socket.id) {
          io.to(p.socketId).emit('force_muted');
        }
      });
      io.to(`meeting_room:${roomKey}`).emit('all_participants_muted', {
        byName: `${user.firstName} ${user.lastName}`,
      });
    });

    // "Spotlight for everyone" — pins one participant's video in every
    // attendee's layout, overriding their individual local pin. Purely a
    // broadcast of intent; the actual layout change happens client-side.
    // Local-only pinning (no broadcast) needs no server round trip at all,
    // so it isn't handled here.
    socket.on('spotlight_participant', async ({ meetingId, room, targetSocketId, targetName, spotlighted }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      const roomKey = room || meetingId;
      io.to(`meeting_room:${roomKey}`).emit('participant_spotlight_changed', {
        targetSocketId: spotlighted ? targetSocketId : null,
        targetName: spotlighted ? targetName : null,
      });
    });

    // `ban: true` mirrors Meet/Teams "Remove from meeting" with the block
    // option — as opposed to a plain removal, which only ends the target's
    // *current* session and lets them send a fresh join request afterward.
    socket.on('remove_participant', async ({ meetingId, room, targetSocketId, ban }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      // `room` is the roomKey the host is currently in (main or a breakout room) —
      // that's where the target participant actually lives, which may differ from
      // the base meetingId used purely for host authorization above.
      const roomKey = room || meetingId;
      const list = meetingParticipants.get(roomKey);
      const target = list?.find((p) => p.socketId === targetSocketId);

      // A co-host removing the primary host would leave the meeting with no
      // one accountable for it (and could be used to lock the actual host
      // out of their own call) — refuse it outright regardless of who's
      // asking.
      if (target && meetingHosts.get(meetingId) === target.userId) return;

      if (list) {
        meetingParticipants.set(roomKey, list.filter(p => p.socketId !== targetSocketId));
      }
      io.to(targetSocketId).emit('removed_from_meeting', { banned: !!ban });
      socket.to(`meeting_room:${roomKey}`).emit('participant_left', { socketId: targetSocketId });

      if (ban && target) {
        const banSet = await getBanSet(meetingId);
        banSet.add(target.userId);
        try {
          await prisma.meeting.update({
            where: { code: meetingId },
            data: { bannedUserIds: [...banSet] },
          });
        } catch (err) {
          console.error('Failed to persist meeting ban:', err);
        }
      }
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

      // Automatically update user presence to IN_MEETING
      prisma.user.update({
        where: { id: userId },
        data: { status: 'IN_MEETING' },
      }).then(() => {
        io.emit('presence', {
          userId,
          status: 'IN_MEETING',
          devices: activeConnections.has(userId) ? (activeDevices.get(userId)?.map(d => d.device) || []) : [],
          lastSeen: new Date()
        });
      }).catch(err => console.error('Failed to auto-update presence to IN_MEETING:', err));
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

      // Automatically restore user presence to ONLINE
      prisma.user.update({
        where: { id: userId },
        data: { status: 'ONLINE' },
      }).then(() => {
        io.emit('presence', {
          userId,
          status: 'ONLINE',
          devices: activeConnections.has(userId) ? (activeDevices.get(userId)?.map(d => d.device) || []) : [],
          lastSeen: new Date()
        });
      }).catch(err => console.error('Failed to restore presence to ONLINE:', err));
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
    socket.on('recording_state', async ({ meetingId, recording }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      socket.to(`meeting:${meetingId}`).emit('meeting_recording_state_changed', {
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

    // ----------------------------------------------------
    // LIVE POLLS (Meet/Teams "Polls" activity) — ephemeral, in-memory only,
    // scoped to the meeting-wide channel so a poll reaches everyone
    // regardless of which breakout room they're currently in.
    // ----------------------------------------------------
    socket.on('create_poll', async ({ meetingId, question, options }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      const cleanQuestion = typeof question === 'string' ? question.trim().slice(0, 300) : '';
      const cleanOptions = Array.isArray(options)
        ? options.map((o: any) => (typeof o === 'string' ? o.trim().slice(0, 120) : '')).filter(Boolean).slice(0, 8)
        : [];
      if (!cleanQuestion || cleanOptions.length < 2) return;

      const poll: ActivePoll = {
        id: crypto.randomUUID(),
        question: cleanQuestion,
        options: cleanOptions,
        votes: new Map(),
        createdBy: userId,
      };
      if (!meetingPolls.has(meetingId)) meetingPolls.set(meetingId, new Map());
      meetingPolls.get(meetingId)!.set(poll.id, poll);

      io.to(`meeting:${meetingId}`).emit('poll_started', {
        pollId: poll.id,
        question: poll.question,
        options: poll.options,
        byName: `${user.firstName} ${user.lastName}`,
      });
    });

    // Anyone in the meeting can vote — one vote per user per poll, and
    // submitting again changes their existing vote rather than adding a
    // second one, same as Meet/Teams polls.
    socket.on('submit_poll_vote', ({ meetingId, pollId, optionIndex }) => {
      const poll = meetingPolls.get(meetingId)?.get(pollId);
      if (!poll || typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex >= poll.options.length) return;
      poll.votes.set(userId, optionIndex);

      const counts = poll.options.map((_, i) => [...poll.votes.values()].filter((v) => v === i).length);
      io.to(`meeting:${meetingId}`).emit('poll_results_updated', {
        pollId,
        counts,
        totalVotes: poll.votes.size,
      });
    });

    socket.on('end_poll', async ({ meetingId, pollId }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      const poll = meetingPolls.get(meetingId)?.get(pollId);
      if (!poll) return;
      meetingPolls.get(meetingId)?.delete(pollId);
      io.to(`meeting:${meetingId}`).emit('poll_ended', { pollId });
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
    socket.on('request_screen_share_permission', async ({ meetingId, room, guestName }) => {
      let hostUserId = meetingHosts.get(meetingId);
      if (!hostUserId) {
        try {
          const meeting = await prisma.meeting.findUnique({ where: { code: meetingId } });
          if (meeting?.hostId) {
            hostUserId = meeting.hostId;
            meetingHosts.set(meetingId, hostUserId);
            activeMeetings.add(meetingId);
          }
        } catch (err) {
          console.error('Failed to look up meeting host as a fallback:', err);
        }
      }
      const roomKey = room || meetingId;
      const payload = { meetingId, socketId: socket.id, guestId: userId, guestName };
      // Broadcast to the room (covers the host's active tab) and, for the same
      // reliability reason as join requests, target the host's user room too.
      socket.to(`meeting_room:${roomKey}`).emit('screen_share_permission_requested', payload);
      if (hostUserId && hostUserId !== userId) {
        io.to(`user:${hostUserId}`).emit('screen_share_permission_requested', payload);
      }
    });

    // Host/co-host's decision, routed back to just the requesting guest.
    socket.on('screen_share_permission_result', async ({ meetingId, targetSocketId, approved }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
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
    socket.on('end_meeting', async ({ meetingId }) => {
      if (!(await assertIsHostOrCoHost(meetingId))) return;
      meetingParticipants.delete(meetingId);
      activeMeetings.delete(meetingId);
      meetingHosts.delete(meetingId);
      lockedMeetings.delete(meetingId);
      meetingCoHosts.delete(meetingId);
      meetingBans.delete(meetingId);
      meetingPolls.delete(meetingId);
      io.to(`meeting:${meetingId}`).emit('meeting_ended');
      console.log(`Meeting ${meetingId} terminated for all participants.`);
    });

    // ----------------------------------------------------
    // DISCONNECTION
    // ----------------------------------------------------
    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: Socket ID ${socket.id} (User: ${userId})`);

      let leftMeeting = false;

      // Cleanup user from all meeting rooms
      meetingParticipants.forEach((list, meetingId) => {
        const index = list.findIndex(p => p.socketId === socket.id);
        if (index !== -1) {
          leftMeeting = true;
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

        if (leftMeeting) {
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'ONLINE' },
          });
          io.emit('presence', {
            userId,
            status: 'ONLINE',
            devices: updatedDevices.map(d => d.device),
            lastSeen: new Date()
          });
        }
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
