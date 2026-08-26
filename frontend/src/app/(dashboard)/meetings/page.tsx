'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { 
  Video, 
  VideoOff, 
  UserX,
  LockOpen,
  Mic, 
  MicOff, 
  Monitor, 
  Copy, 
  Users, 
  MessageSquare, 
  Eraser, 
  Download, 
  Rss,
  PhoneOff, 
  Plus, 
  X, 
  Send, 
  Maximize2, 
  Minimize2,
  Check, 
  Circle,
  HelpCircle,
  Calendar,
  Grid,
  LayoutGrid,
  Loader2,
  Lock,
  Compass,
  Share2,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Pin,
  PinOff,
  Crown,
  Ban,
  BarChart3,
  Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../../hooks/useSocket';
import { api } from '../../../services/api';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';
import { useConfirm } from '../../../context/ConfirmContext';

// Remote video stream binder for WebRTC
const RemoteVideo = ({ stream, className }: { stream: MediaStream; className?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={videoRef} autoPlay playsInline className={className} />;
};

export default function MeetingsPage() {
  const { user } = useAuthStore();
  const confirm = useConfirm();
  const { socket } = useSocket();
  const { settings: orgSettings } = useOrganizationSettings();
  
  // Hand Raised & Floating reactions
  const [handRaised, setHandRaised] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; reaction: string; x: number }[]>([]);
  
  // WebRTC remote streams & peer connections tracker
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  // Screen share is tracked SEPARATELY from camera per-peer: both are "video" kind
  // tracks, so we can't tell them apart from WebRTC alone. `peer_screen_share_changed`
  // (see socket listener below) tells us who is currently presenting; we use that
  // plus each peer's already-known camera stream id to sort incoming video tracks
  // into the right bucket in `pc.ontrack`.
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});
  const screenSharingPeerIds = useRef<Set<string>>(new Set());
  const peerCameraStreamIds = useRef<Record<string, string>>({});
  const peerScreenStreamIds = useRef<Record<string, string>>({});
  // Dedicated RTCRtpSenders used for OUR outgoing screen video/audio per peer, so
  // stopping/starting a share never collides with the camera senders.
  const screenSenders = useRef<Record<string, RTCRtpSender>>({});
  const screenAudioSenders = useRef<Record<string, RTCRtpSender>>({});

  // Screen-share permission gate for non-host presenters
  const [screenSharePermissionRequests, setScreenSharePermissionRequests] = useState<any[]>([]);
  const [awaitingScreenSharePermission, setAwaitingScreenSharePermission] = useState(false);
  
  // Host End Call confirmation dialog
  const [showEndMeetingModal, setShowEndMeetingModal] = useState(false);
  
  // Whiteboard drawing coordinate tracker
  const lastDrawingPos = useRef<{ x: number; y: number } | null>(null);

  // Recording chunks ref
  const recordingChunks = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingCaptureStream = useRef<MediaStream | null>(null);
  const recordingAudioContext = useRef<AudioContext | null>(null);
  
  // Navigation / State Gates
  const [meetingStep, setMeetingStep] = useState<'lobby' | 'waiting' | 'room'>('lobby'); // lobby, waiting, room
  const [meetingId, setMeetingId] = useState('');
  
  // Google Meet Modals/UI States
  const [showShareModal, setShowShareModal] = useState(false);
  const [newMeetingCode, setNewMeetingCode] = useState('');
  
  // Host/Guest states matching requirements
  const [isHost, setIsHost] = useState(false);
  const [hostUserId, setHostUserId] = useState('');
  const [hostStartedMeeting, setHostStartedMeeting] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [waitingStatus, setWaitingStatus] = useState<'not_started' | 'asking' | 'denied'>('not_started');

  // Co-host (Meet "co-host" / Teams "co-organizer") state. isCoHost is
  // derived from coHostIds whenever either changes (see effect below),
  // rather than being set directly, so it can never drift out of sync with
  // the authoritative list.
  const [coHostIds, setCoHostIds] = useState<string[]>([]);
  const [isCoHost, setIsCoHost] = useState(false);
  // Host OR co-host — the gate used throughout the room UI for moderation
  // controls (admit, mute, remove, lock, breakout rooms, polls, spotlight).
  const canModerate = isHost || isCoHost;
  const [meetingMuteOnEntry, setMeetingMuteOnEntry] = useState(false);

  // Meeting timer — startedAt comes from the DB (getMeetingByCode) for a
  // guest joining a call already in progress, or is set locally the moment
  // the host/co-host starts it, then ticks via the effect further down.
  const [meetingStartedAt, setMeetingStartedAt] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Pin (local-only, "pin for me") vs spotlight (host/co-host broadcasts it
  // to everyone, overriding each viewer's local pin). Spotlight always wins
  // when both are set, same as Meet.
  const [localPinnedSocketId, setLocalPinnedSocketId] = useState<string | null>(null);
  const [spotlightedSocketId, setSpotlightedSocketId] = useState<string | null>(null);
  const [spotlightedName, setSpotlightedName] = useState<string | null>(null);
  const effectivePinnedSocketId = spotlightedSocketId ?? localPinnedSocketId;

  // Grid (everyone equal size) vs Speaker (one large tile) layout — a pure
  // client-side view preference, not broadcast to anyone else.
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Per-peer connection quality, refreshed periodically from
  // RTCPeerConnection.getStats() while in the room (see effect below).
  const [connectionQuality, setConnectionQuality] = useState<Record<string, 'good' | 'fair' | 'poor'>>({});

  // Live polls (Meet/Teams "Polls" activity) — ephemeral, mirrors the
  // in-memory state on the server; nothing here is meant to survive a page
  // refresh.
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [activePoll, setActivePoll] = useState<{ pollId: string; question: string; options: string[]; byName: string } | null>(null);
  const [pollResults, setPollResults] = useState<{ counts: number[]; totalVotes: number } | null>(null);
  const [myPollVote, setMyPollVote] = useState<number | null>(null);
  
  // Media States
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  
  // WebRTC Media Streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Mirrors of `user` / `mediaStream` for use inside the socket listener effect
  // below. That effect must stay subscribed for the entire meeting — if it
  // depended on `user` or `mediaStream` directly, it would tear down and
  // re-register every socket listener (including the one that shows the
  // host the "X wants to join" prompt) any time either changed, e.g. every
  // few minutes when the presence system flips status to/from AWAY, or
  // whenever the camera/mic is toggled and the stream is re-acquired. Reading
  // through a ref instead keeps the listeners mounted continuously, so a
  // join request can never arrive in the gap between teardown and re-setup.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const mediaStreamRef = useRef(mediaStream);
  useEffect(() => { mediaStreamRef.current = mediaStream; }, [mediaStream]);

  // isCoHost is always derived, never set directly, so it can't drift out of
  // sync with coHostIds (which is itself kept current by the co_hosts_updated
  // socket listener below).
  useEffect(() => {
    setIsCoHost(!isHost && !!user && coHostIds.includes(user.id));
  }, [isHost, coHostIds, user]);

  // Meeting timer — ticks once a second while in the room. meetingStartedAt
  // is set either from the DB (joining a call already live) or locally the
  // moment the host/co-host starts it.
  useEffect(() => {
    if (meetingStep !== 'room' || !meetingStartedAt) return;
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - meetingStartedAt.getTime()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [meetingStep, meetingStartedAt]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts (Ctrl/Cmd+D mic, Ctrl/Cmd+E camera) — mirrors Google
  // Meet's own shortcuts. Ignored while typing in chat or anywhere else with
  // text focus so a stray Ctrl+D in a message doesn't cut someone's mic.
  useEffect(() => {
    if (meetingStep !== 'room') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isTyping || !(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setAudioOn(prev => !prev);
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setVideoOn(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [meetingStep]);

  // Whiteboard Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#4f46e5');
  const [drawSize, setDrawSize] = useState(4);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  
  // Sidebar Panel (Chat vs Participants)
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'participants'>('chat');
  const [showSidebar, setShowSidebar] = useState(true);
  
  // In-Meeting Chat & Participants
  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: 'System', content: 'Welcome to the meeting workspace! All feeds are encrypted.', time: 'Now' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [mediaAccessFailed, setMediaAccessFailed] = useState(false);

  // Lightweight per-peer connection quality, sampled from WebRTC stats every
  // few seconds — packet loss and round-trip time are the two cheapest,
  // most broadly-supported signals for "is this call about to get choppy."
  useEffect(() => {
    if (meetingStep !== 'room') return;
    const sample = async () => {
      const entries = Object.entries(peerConnections.current);
      const results: Record<string, 'good' | 'fair' | 'poor'> = {};
      await Promise.all(entries.map(async ([socketId, pc]) => {
        try {
          const stats = await pc.getStats();
          let packetsLost = 0;
          let packetsReceived = 0;
          let rttMs: number | null = null;
          stats.forEach((report: any) => {
            if (report.type === 'inbound-rtp' && !report.isRemote) {
              packetsLost += report.packetsLost || 0;
              packetsReceived += report.packetsReceived || 0;
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime != null) {
              rttMs = report.currentRoundTripTime * 1000;
            }
          });
          const lossRatio = packetsReceived > 0 ? packetsLost / (packetsLost + packetsReceived) : 0;
          if (lossRatio > 0.08 || (rttMs != null && rttMs > 400)) results[socketId] = 'poor';
          else if (lossRatio > 0.02 || (rttMs != null && rttMs > 200)) results[socketId] = 'fair';
          else results[socketId] = 'good';
        } catch {
          // getStats can transiently fail right as a connection is being torn
          // down/renegotiated — just skip that peer for this sample.
        }
      }));
      setConnectionQuality(results);
    };
    sample();
    const interval = setInterval(sample, 5000);
    return () => clearInterval(interval);
  }, [meetingStep, participants]);

  // Breakout Rooms State — "main" always implicitly exists; any other rooms are
  // created by the host and broadcast to everyone via `breakout_rooms_updated`.
  const [breakoutRooms, setBreakoutRooms] = useState<{ id: string; name: string }[]>([
    { id: 'main', name: 'Main Room' },
  ]);
  const [activeRoomId, setActiveRoomId] = useState('main');
  const [showBreakoutMenu, setShowBreakoutMenu] = useState(false);
  const [newBreakoutRoomName, setNewBreakoutRoomName] = useState('');

  // Meeting Scheduling State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState('30');
  const [scheduleInviteeIds, setScheduleInviteeIds] = useState<string[]>([]);
  const [scheduleCoHostIds, setScheduleCoHostIds] = useState<string[]>([]);
  const [scheduleMuteOnEntry, setScheduleMuteOnEntry] = useState(false);
  const [scheduleRecurrenceRule, setScheduleRecurrenceRule] = useState(''); // '' = one-off
  const [scheduleRecurrenceEndDate, setScheduleRecurrenceEndDate] = useState('');
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [myMeetings, setMyMeetings] = useState<any[]>([]);
  const [loadingMyMeetings, setLoadingMyMeetings] = useState(true);
  const [respondingInviteId, setRespondingInviteId] = useState('');

  // True while we're resolving a `?code=` link the user landed on (calendar
  // invite, .ics link, subscribed-feed link, pasted invite URL) — shows a
  // brief loading state on the lobby instead of a flash of the "New meeting /
  // Join a meeting" form before we redirect them straight into the meeting.
  const [resolvingLinkCode, setResolvingLinkCode] = useState(false);
  // Guards against processing the same ?code= link twice — e.g. React 18
  // Strict Mode double-invoking effects in dev, or this effect re-running
  // for any other reason while the async lookup below is still in flight.
  const handledLinkCodeRef = useRef<string | null>(null);

  // Meeting Recording
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // WebRTC: Create RTCPeerConnection for a specific target socket ID
  const createPeerConnection = (targetSocketId: string) => {
    if (peerConnections.current[targetSocketId]) {
      peerConnections.current[targetSocketId].close();
    }

    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);
    peerConnections.current[targetSocketId] = pc;

    // Add local tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        pc.addTrack(track, mediaStream);
      });
    }
    if (screenStream) {
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        screenSenders.current[targetSocketId] = pc.addTrack(videoTrack, screenStream);
      }
      const audioTrack = screenStream.getAudioTracks()[0];
      if (audioTrack) {
        screenAudioSenders.current[targetSocketId] = pc.addTrack(audioTrack, screenStream);
      }
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_signal', {
          targetSocketId,
          signal: { candidate: event.candidate }
        });
      }
    };

    // Remote Track received handler.
    // A peer can send up to 4 tracks: camera-audio + camera-video (sharing one
    // MediaStream id), and screen-video + screen-audio-if-granted (sharing a
    // DIFFERENT MediaStream id). We classify by MediaStream identity — not by
    // track.kind — which is what lets screen-share audio (e.g. sharing a video
    // with sound) land in the right bucket instead of being mistaken for mic audio.
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      console.log(`WebRTC: Received remote ${event.track.kind} track from ${targetSocketId}`);

      const knownCameraId = peerCameraStreamIds.current[targetSocketId];
      const knownScreenId = peerScreenStreamIds.current[targetSocketId];
      const isFlaggedSharing = screenSharingPeerIds.current.has(targetSocketId);

      if (stream.id === knownCameraId) {
        setRemoteStreams(prev => ({ ...prev, [targetSocketId]: stream }));
        return;
      }
      if (stream.id === knownScreenId) {
        setRemoteScreenStreams(prev => ({ ...prev, [targetSocketId]: stream }));
        return;
      }

      // First time we've seen this MediaStream id from this peer.
      if (!knownCameraId) {
        peerCameraStreamIds.current[targetSocketId] = stream.id;
        setRemoteStreams(prev => ({ ...prev, [targetSocketId]: stream }));
      } else if (isFlaggedSharing) {
        peerScreenStreamIds.current[targetSocketId] = stream.id;
        setRemoteScreenStreams(prev => ({ ...prev, [targetSocketId]: stream }));
      } else {
        // Camera stream was replaced (e.g. device switch) — treat as the new camera.
        peerCameraStreamIds.current[targetSocketId] = stream.id;
        setRemoteStreams(prev => ({ ...prev, [targetSocketId]: stream }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`WebRTC Connection State with ${targetSocketId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setRemoteStreams(prev => {
          const updated = { ...prev };
          delete updated[targetSocketId];
          return updated;
        });
        setRemoteScreenStreams(prev => {
          const updated = { ...prev };
          delete updated[targetSocketId];
          return updated;
        });
        delete peerCameraStreamIds.current[targetSocketId];
        delete peerScreenStreamIds.current[targetSocketId];
        delete screenSenders.current[targetSocketId];
        delete screenAudioSenders.current[targetSocketId];
        screenSharingPeerIds.current.delete(targetSocketId);
      }
    };

    return pc;
  };

  // Renegotiate an EXISTING peer connection (new offer/answer) without tearing
  // it down. Used whenever tracks are added/removed/replaced after the initial
  // connection — e.g. starting or stopping screen share.
  const renegotiate = async (targetSocketId: string) => {
    const pc = peerConnections.current[targetSocketId];
    if (!pc || !socket) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_signal', {
        targetSocketId,
        signal: { sdp: pc.localDescription }
      });
    } catch (err) {
      console.error('Renegotiation failed:', err);
    }
  };

  // WebRTC: Create and send WebRTC offer to target socket ID
  const createWebRTCOffer = async (targetSocketId: string) => {
    try {
      const pc = createPeerConnection(targetSocketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit('webrtc_signal', {
          targetSocketId,
          signal: { sdp: pc.localDescription }
        });
      }
    } catch (err) {
      console.error('Failed to create WebRTC offer:', err);
    }
  };

  // WebRTC: Sync local camera/mic tracks dynamically when mediaStream changes
  useEffect(() => {
    if (mediaStream) {
      Object.entries(peerConnections.current).forEach(([socketId, pc]) => {
        mediaStream.getTracks().forEach(track => {
          const senders = pc.getSenders();
          // Only ever match against the CAMERA sender, never a dedicated screen
          // sender — otherwise a screen-share replaceTrack would collide here.
          const sender = senders.find(s =>
            s.track &&
            s.track.kind === track.kind &&
            s !== screenSenders.current[socketId] &&
            s !== screenAudioSenders.current[socketId]
          );
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, mediaStream);
          }
        });
      });
    }
  }, [mediaStream]);

  // WebRTC: Start/stop screen share (video + optional system/tab audio) on
  // every open peer connection whenever screenStream changes. Uses sender
  // references dedicated to screen tracks so they never collide with the
  // camera senders, and properly removes tracks (rather than leaving them
  // silently frozen) when sharing stops.
  useEffect(() => {
    Object.entries(peerConnections.current).forEach(([socketId, pc]) => {
      const existingVideoSender = screenSenders.current[socketId];
      const existingAudioSender = screenAudioSenders.current[socketId];
      let touched = false;

      if (screenStream) {
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack) {
          if (existingVideoSender) existingVideoSender.replaceTrack(videoTrack);
          else screenSenders.current[socketId] = pc.addTrack(videoTrack, screenStream);
          touched = true;
        }
        // System/tab audio is only present if the OS/browser granted it (e.g.
        // "Share tab audio" — sharing a single app window usually has none).
        const audioTrack = screenStream.getAudioTracks()[0];
        if (audioTrack) {
          if (existingAudioSender) existingAudioSender.replaceTrack(audioTrack);
          else screenAudioSenders.current[socketId] = pc.addTrack(audioTrack, screenStream);
          touched = true;
        }
      } else {
        if (existingVideoSender) {
          pc.removeTrack(existingVideoSender);
          delete screenSenders.current[socketId];
          touched = true;
        }
        if (existingAudioSender) {
          pc.removeTrack(existingAudioSender);
          delete screenAudioSenders.current[socketId];
          touched = true;
        }
      }

      if (touched) renegotiate(socketId);
    });

    // Tell every participant, via the signaling channel, whether we're presenting —
    // this is how remote peers distinguish our screen track from our camera track.
    if (socket) {
      const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
      socket.emit('screen_share_state', { meetingId: room, sharing: !!screenStream });
    }
  }, [screenStream]);

  // Listen for peers starting/stopping their screen share, and for the
  // permission handshake when a non-host wants to present.
  useEffect(() => {
    if (!socket) return;

    const handlePeerScreenShareChanged = ({ socketId, sharing }: { socketId: string; sharing: boolean }) => {
      if (sharing) {
        screenSharingPeerIds.current.add(socketId);
      } else {
        screenSharingPeerIds.current.delete(socketId);
        setRemoteScreenStreams(prev => {
          const updated = { ...prev };
          delete updated[socketId];
          return updated;
        });
      }
    };

    const handlePermissionRequested = (payload: any) => {
      if (!canModerate) return;
      setScreenSharePermissionRequests(prev =>
        prev.some(r => r.socketId === payload.socketId) ? prev : [...prev, payload]
      );
      toast(`${payload.guestName} wants to share their screen`, { icon: '🖥️' });
    };

    const handlePermissionResult = ({ approved }: { approved: boolean }) => {
      setAwaitingScreenSharePermission(false);
      if (approved) {
        toast.success('Host approved — you can now share your screen.');
        toggleScreenSharing();
      } else {
        toast.error('Host denied the screen share request.');
      }
    };

    socket.on('peer_screen_share_changed', handlePeerScreenShareChanged);
    socket.on('screen_share_permission_requested', handlePermissionRequested);
    socket.on('screen_share_permission_result', handlePermissionResult);

    return () => {
      socket.off('peer_screen_share_changed', handlePeerScreenShareChanged);
      socket.off('screen_share_permission_requested', handlePermissionRequested);
      socket.off('screen_share_permission_result', handlePermissionResult);
    };
  }, [socket, canModerate]);

  // Recording consent notice — every participant (not just the host) needs to
  // know a recording is running, matching Meet/Teams behavior.
  const [recordingNotice, setRecordingNotice] = useState<{ recording: boolean; byName: string } | null>(null);
  useEffect(() => {
    if (!socket) return;
    const handleRecordingStateChanged = (payload: { recording: boolean; byName: string }) => {
      setRecordingNotice(payload.recording ? payload : null);
      toast(payload.recording ? `${payload.byName} started recording this meeting` : `${payload.byName} stopped recording`, { icon: '⏺️' });
    };
    socket.on('meeting_recording_state_changed', handleRecordingStateChanged);
    return () => { socket.off('meeting_recording_state_changed', handleRecordingStateChanged); };
  }, [socket]);

  // Host moderation: lock/unlock, force-mute, and remove a participant.
  // Every participant listens for the two things that can happen TO them
  // (being force-muted, being removed); only the host calls the dispatchers.
  const [meetingLocked, setMeetingLocked] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleLockChanged = ({ locked }: { locked: boolean }) => {
      setMeetingLocked(locked);
      toast(locked ? 'Meeting locked — no new participants can join.' : 'Meeting unlocked.', { icon: locked ? '🔒' : '🔓' });
    };

    const handleForceMuted = () => {
      setAudioOn(false);
      if (mediaStream) {
        mediaStream.getAudioTracks().forEach(track => (track.enabled = false));
      }
      toast('The host muted your microphone.', { icon: '🔇' });
    };

    const handleRemoved = ({ banned }: { banned?: boolean } = {}) => {
      toast.error(banned ? 'You were removed and blocked from this meeting by the host.' : 'You were removed from the meeting by the host.');
      handleDisconnect(false);
    };

    const handleAllMuted = ({ byName }: { byName: string }) => {
      setAudioOn(false);
      if (mediaStream) {
        mediaStream.getAudioTracks().forEach(track => (track.enabled = false));
      }
      toast(`${byName} muted everyone in the room.`, { icon: '🔇' });
    };

    const handleSpotlightChanged = ({ targetSocketId, targetName }: { targetSocketId: string | null; targetName: string | null }) => {
      setSpotlightedSocketId(targetSocketId);
      setSpotlightedName(targetName);
      if (targetSocketId) toast(`${targetName} was spotlighted for everyone.`, { icon: '⭐' });
    };

    socket.on('meeting_lock_changed', handleLockChanged);
    socket.on('force_muted', handleForceMuted);
    socket.on('removed_from_meeting', handleRemoved);
    socket.on('all_participants_muted', handleAllMuted);
    socket.on('participant_spotlight_changed', handleSpotlightChanged);

    return () => {
      socket.off('meeting_lock_changed', handleLockChanged);
      socket.off('force_muted', handleForceMuted);
      socket.off('removed_from_meeting', handleRemoved);
      socket.off('all_participants_muted', handleAllMuted);
      socket.off('participant_spotlight_changed', handleSpotlightChanged);
    };
  }, [socket, mediaStream]);

  // Co-hosts stay in sync live — including for the person who was just
  // (de)promoted, so their own moderation controls appear/disappear without
  // needing a refresh.
  useEffect(() => {
    if (!socket) return;
    const handleCoHostsUpdated = ({ coHostIds: next }: { coHostIds: string[] }) => setCoHostIds(next);
    socket.on('co_hosts_updated', handleCoHostsUpdated);
    return () => { socket.off('co_hosts_updated', handleCoHostsUpdated); };
  }, [socket]);

  // Live polls — ephemeral, mirrors the in-memory poll state the server
  // holds for the meeting.
  useEffect(() => {
    if (!socket) return;

    const handlePollStarted = (payload: { pollId: string; question: string; options: string[]; byName: string }) => {
      setActivePoll(payload);
      setPollResults({ counts: payload.options.map(() => 0), totalVotes: 0 });
      setMyPollVote(null);
      toast(`${payload.byName} started a poll`, { icon: '📊' });
    };

    const handlePollResultsUpdated = ({ counts, totalVotes }: { pollId: string; counts: number[]; totalVotes: number }) => {
      setPollResults({ counts, totalVotes });
    };

    const handlePollEnded = ({ pollId }: { pollId: string }) => {
      setActivePoll(prev => (prev?.pollId === pollId ? null : prev));
      setMyPollVote(null);
    };

    socket.on('poll_started', handlePollStarted);
    socket.on('poll_results_updated', handlePollResultsUpdated);
    socket.on('poll_ended', handlePollEnded);

    return () => {
      socket.off('poll_started', handlePollStarted);
      socket.off('poll_results_updated', handlePollResultsUpdated);
      socket.off('poll_ended', handlePollEnded);
    };
  }, [socket]);

  const handleCreatePoll = () => {
    if (!socket || !canModerate) return;
    const cleanOptions = pollOptions.map(o => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || cleanOptions.length < 2) {
      toast.error('A poll needs a question and at least 2 options.');
      return;
    }
    socket.emit('create_poll', { meetingId, question: pollQuestion.trim(), options: cleanOptions });
    setShowCreatePollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleVotePoll = (optionIndex: number) => {
    if (!socket || !activePoll) return;
    setMyPollVote(optionIndex);
    socket.emit('submit_poll_vote', { meetingId, pollId: activePoll.pollId, optionIndex });
  };

  const handleEndPoll = () => {
    if (!socket || !activePoll || !canModerate) return;
    socket.emit('end_poll', { meetingId, pollId: activePoll.pollId });
  };

  // Breakout room list stays in sync for everyone as the host creates/renames/
  // removes rooms, and everyone gets pulled back to main when the host closes them.
  useEffect(() => {
    if (!socket) return;

    const handleBreakoutRoomsUpdated = ({ rooms }: { rooms: { id: string; name: string }[] }) => {
      setBreakoutRooms([{ id: 'main', name: 'Main Room' }, ...rooms]);
      setActiveRoomId(prev => (prev === 'main' || rooms.some(r => r.id === prev)) ? prev : 'main');
    };

    const handleBreakoutRoomsClosed = () => {
      setActiveRoomId(prev => {
        if (prev !== 'main') {
          toast('The host closed breakout rooms — you\'re back in the main room.', { icon: '↩️' });
        }
        return 'main';
      });
    };

    socket.on('breakout_rooms_updated', handleBreakoutRoomsUpdated);
    socket.on('breakout_rooms_closed', handleBreakoutRoomsClosed);

    return () => {
      socket.off('breakout_rooms_updated', handleBreakoutRoomsUpdated);
      socket.off('breakout_rooms_closed', handleBreakoutRoomsClosed);
    };
  }, [socket]);

  const handleToggleMeetingLock = () => {
    if (!socket || !canModerate) return;
    const next = !meetingLocked;
    setMeetingLocked(next);
    socket.emit('toggle_meeting_lock', { meetingId, locked: next });
  };

  const handleForceMuteParticipant = (targetSocketId: string, name: string) => {
    if (!socket || !canModerate) return;
    const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
    socket.emit('force_mute_participant', { meetingId, room, targetSocketId });
    toast.success(`Muted ${name}.`);
  };

  // "Mute all" — mutes everyone currently in the active room in one action,
  // the way Meet/Teams both offer for larger calls.
  const handleMuteAllParticipants = () => {
    if (!socket || !canModerate) return;
    const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
    socket.emit('mute_all_participants', { meetingId, room });
    toast.success('Muted everyone in the room.');
  };

  // Plain removal ends the target's current session but leaves the door open
  // for them to send a fresh join request. `ban: true` additionally blocks
  // them from rejoining at all (mirrors Meet/Teams "Remove from meeting" +
  // block), so it gets its own confirmation given it's the less reversible
  // of the two.
  const handleRemoveParticipant = async (targetSocketId: string, name: string, ban = false) => {
    if (!socket || !canModerate) return;
    if (ban) {
      const ok = await confirm({
        title: 'Remove and block?',
        message: `${name} will be removed from the call and won't be able to rejoin using this meeting's link or code.`,
        confirmText: 'Remove and block',
        type: 'danger',
      });
      if (!ok) return;
    }
    const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
    socket.emit('remove_participant', { meetingId, room, targetSocketId, ban });
    setParticipants(prev => prev.filter(p => p.socketId !== targetSocketId));
    toast.success(ban ? `Removed ${name} and blocked them from rejoining.` : `Removed ${name} from the meeting.`);
  };

  // Co-host management — host-only (a co-host can't promote/demote other
  // co-hosts). Persists via REST (so it survives a refresh) and the server
  // also broadcasts `co_hosts_updated` so every client — including the
  // newly (de)promoted one — picks up the change live.
  const [updatingCoHostId, setUpdatingCoHostId] = useState('');
  const handleToggleCoHost = async (targetUserId: string, name: string, makeCoHost: boolean) => {
    if (!isHost) return;
    const next = makeCoHost ? [...coHostIds, targetUserId] : coHostIds.filter((id) => id !== targetUserId);
    setUpdatingCoHostId(targetUserId);
    try {
      await api.updateMeetingCoHosts(meetingId, next);
      setCoHostIds(next);
      toast.success(makeCoHost ? `${name} is now a co-host.` : `${name} is no longer a co-host.`);
    } catch (err: any) {
      toast.error(err.message || 'Could not update co-hosts.');
    } finally {
      setUpdatingCoHostId('');
    }
  };

  // "Pin for me" — local only, no broadcast. Toggling it off (clicking the
  // already-pinned tile again) returns to the default grid.
  const handleTogglePin = (targetSocketId: string) => {
    setLocalPinnedSocketId(prev => (prev === targetSocketId ? null : targetSocketId));
  };

  // "Spotlight for everyone" — host/co-host only, overrides everyone's local
  // pin until toggled off or the meeting ends.
  const handleSpotlightParticipant = (targetSocketId: string, name: string, spotlight: boolean) => {
    if (!socket || !canModerate) return;
    const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
    socket.emit('spotlight_participant', { meetingId, room, targetSocketId, targetName: name, spotlighted: spotlight });
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Fullscreen isn\'t available in this browser.');
    }
  };

  const handleAdmitAllRequests = () => {
    joinRequests.forEach(req => handleAdmitRequest(req.id, true));
  };

  const handleDisconnect = (endForEveryone = false) => {
    setMeetingStep('lobby');
    setHostStartedMeeting(false);
    setIsHost(false);
    setHostUserId('');
    setBreakoutRooms([{ id: 'main', name: 'Main Room' }]);
    setActiveRoomId('main');
    setShowBreakoutMenu(false);
    setCoHostIds([]);
    setMeetingMuteOnEntry(false);
    setMeetingStartedAt(null);
    setElapsedSeconds(0);
    setLocalPinnedSocketId(null);
    setSpotlightedSocketId(null);
    setSpotlightedName(null);
    setViewMode('grid');
    setConnectionQuality({});
    setActivePoll(null);
    setPollResults(null);
    setMyPollVote(null);
    
    if (socket) {
      const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
      if (endForEveryone) {
        // Meeting-wide: must reach everyone, including anyone currently inside a
        // breakout room, so this always targets the base meetingId/whole-meeting
        // channel — never the room-suffixed breakout id.
        socket.emit('end_meeting', { meetingId });
        // Persist so a stale/expired code fails the REST lookup for future joiners.
        api.endMeeting(meetingId).catch(() => {});
      } else {
        socket.emit('leave_meeting_room', { meetingId: room });
      }
    }

    // Clean up peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    toast.success(endForEveryone ? 'Meeting ended.' : 'You left the meeting.');
  };

  // Auto-launch straight into a meeting when the URL carries a join code —
  // e.g. a calendar invite (.ics) link, a subscribed calendar-feed entry, or
  // a pasted invite link. Matches Google Meet/Teams: clicking the link takes
  // you straight to the meeting page (waiting room if it hasn't started yet,
  // or directly into the call if it's already live) instead of dropping you
  // on the plain lobby form and making you press "Join" again.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    // `code` is what the backend puts in .ics / calendar-feed links (see
    // getMeetingIcs / getCalendarFeed); `joinCode` is what this page's own
    // "Invite Link" / "Send invite" buttons generate (buildInviteLink).
    // Accepting either means both link sources land the visitor in the
    // meeting instead of only one of them working.
    const rawCode = params.get('code') || params.get('joinCode');
    if (!rawCode || handledLinkCodeRef.current === rawCode) return;
    handledLinkCodeRef.current = rawCode;

    // Strip the code from the visible URL immediately so refreshing mid-call,
    // hitting back, or copying the address bar later doesn't re-trigger this
    // flow or hand around a now-stale code.
    window.history.replaceState({}, '', window.location.pathname);

    const code = rawCode.trim().toLowerCase();
    setResolvingLinkCode(true);
    api.getMeetingByCode(code)
      .then((meeting: any) => {
        if (meeting.status === 'CANCELLED') {
          toast.error('This meeting has been cancelled by the host.');
          return;
        }
        const iAmHost = !!userRef.current && meeting.hostId === userRef.current.id;
        const iAmCoHost = !iAmHost && !!userRef.current && (meeting.coHostIds || []).includes(userRef.current.id);
        setMeetingId(meeting.code);
        setHostUserId(meeting.hostId);
        setCoHostIds(meeting.coHostIds || []);
        setMeetingMuteOnEntry(!!meeting.muteOnEntry);

        if (iAmHost || iAmCoHost) {
          setIsHost(iAmHost);
          if (meeting.status === 'LIVE') {
            // Host/co-host is reconnecting to a call already started elsewhere
            // (e.g. opened their own invite link from a second device/tab) —
            // drop them straight into the room, no waiting room needed.
            setHostStartedMeeting(true);
            setMeetingStartedAt(meeting.startedAt ? new Date(meeting.startedAt) : new Date());
            setMeetingStep('room');
          } else {
            // Not started yet. The meeting should only go live when someone
            // explicitly starts it — so surface the same "share / start now"
            // panel the instant-meeting flow uses, rather than auto-starting
            // it just because the link was opened.
            setNewMeetingCode(meeting.code);
            setShowShareModal(true);
          }
        } else {
          setIsHost(false);
          setHostStartedMeeting(meeting.status === 'LIVE');
          setMeetingStartedAt(meeting.startedAt ? new Date(meeting.startedAt) : null);
          setMeetingStep('waiting');
        }
      })
      .catch((err: any) => {
        toast.error(err?.message || 'No meeting found with that code. Double-check it and try again.');
      })
      .finally(() => setResolvingLinkCode(false));
  }, []);

  // WebRTC User Media initializer
  const initUserMedia = async () => {
    try {
      setMediaAccessFailed(false);
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: videoOn ? true : false,
        audio: audioOn ? true : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Media capture failed, starting simulated workspace call:', err);
      setMediaAccessFailed(true);
    }
  };

  // Permissions are ONLY requested when the meeting step transitions to 'room' (no prompt on lobby load!)
  useEffect(() => {
    if (meetingStep === 'room') {
      initUserMedia();
    }
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [meetingStep, videoOn, audioOn]);

  // Ask for OS notification permission once, up front — like Meet/Teams do the
  // first time you host a call — so a later join request can actually raise a
  // system notification instead of silently failing the permission check.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Plays a short two-tone chime (Web Audio API — no audio asset needed) and,
  // if this tab isn't the one currently focused, raises a native OS
  // notification too. Meet/Teams do the same: an in-call prompt if you're
  // looking at the call, plus a system-level nudge if you're not, so a host
  // who's tabbed away still notices someone waiting to get in.
  const notifyJoinRequest = (guestName: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        [660, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
          gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.16 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.16);
          osc.stop(ctx.currentTime + i * 0.16 + 0.2);
        });
      }
    } catch {
      // Non-fatal — the in-app toast/popup still shows either way.
    }

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      document.hidden
    ) {
      try {
        const n = new Notification('Someone wants to join your meeting', {
          body: `${guestName} is asking to join your call.`,
          tag: 'meeting-join-request',
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        // Some browsers restrict constructing Notification directly; safe to ignore.
      }
    }
  };

  // Real-time socket event listeners for meetings coordination
  useEffect(() => {
    if (!socket) return;

    // Listen for meeting started (sent to guests in lobby)
    socket.on('meeting_started', ({ meetingId: startedId }) => {
      setHostStartedMeeting(true);
      setWaitingStatus('asking');
      // Automatically request entry when the meeting starts
      socket.emit('request_to_join_meeting', { 
        meetingId: startedId, 
        guestName: `${userRef.current?.firstName} ${userRef.current?.lastName || ''}` 
      });
      toast.success('Host started the meeting! Requesting entry...');
    });

    // Listen for guest requesting to join (received by Host in room). Shows
    // the same in-app accept/cancel prompt Meet/Teams show, plus — since the
    // host may well not have this tab focused — a native OS notification and
    // a short chime so it's noticed even from another tab or app.
    socket.on('guest_request_to_join', ({ guestId, guestName, socketId }) => {
      setJoinRequests(prev => {
        // Prevent duplicate request popups
        if (prev.some(r => r.id === socketId)) return prev;
        return [...prev, { id: socketId, name: guestName }];
      });
      toast(`🔔 ${guestName} is requesting to join the call.`, { id: socketId });
      notifyJoinRequest(guestName);
    });

    // Listen for host's admission result (received by Guest)
    socket.on('meeting_admission_result', ({ admit, meetingId: decisionId, locked, banned }) => {
      if (admit) {
        setMeetingStep('room');
        setMeetingStartedAt(prev => prev ?? new Date());
        // Applied client-side (from the host's muteOnEntry setting, fetched
        // earlier via getMeetingByCode) rather than waiting on a server round
        // trip — avoids a race with the media-acquisition effect that runs
        // the moment meetingStep flips to 'room'.
        if (meetingMuteOnEntry) setAudioOn(false);
        toast.success('You have been admitted to the meeting!');
      } else if (banned) {
        setWaitingStatus('denied');
        toast.error('You have been removed from this meeting by the host.');
      } else {
        setWaitingStatus('denied');
        toast.error(locked ? 'This meeting is locked by the host.' : 'The host denied your entry request.');
      }
    });

    // Listen for active participants (sent upon joining room)
    socket.on('meeting_active_participants', (activeParticipants) => {
      const remoteOnes = activeParticipants.filter((p: any) => p.socketId !== socket.id);
      setParticipants(remoteOnes);
      
      // Initiate WebRTC connections to everyone already in the room
      remoteOnes.forEach((p: any) => {
        createWebRTCOffer(p.socketId);
      });
    });

    // Listen for other participants joining the call room
    socket.on('participant_joined', (participant) => {
      setParticipants(prev => {
        if (prev.some(p => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });
      toast.success(`${participant.name} joined the call.`);

      // Deliberately NOT calling createWebRTCOffer here. The joining peer's
      // own 'meeting_active_participants' handler above already offers to
      // every participant already in the room (including us) — if we also
      // offer back to them here, both sides send a simultaneous SDP offer
      // for the same pair with no rollback/"polite peer" logic to resolve
      // the collision, which is the classic WebRTC glare failure: the
      // signaling exchange can end up stuck (setRemoteDescription rejected
      // because we're not in 'stable' state), silently dropping that one
      // participant's audio/video for everyone else. Only the newer peer
      // needs to initiate; we just wait for their offer and answer it via
      // the 'webrtc_signal' handler below.
    });

    // Listen for participant leaving the call room
    socket.on('participant_left', ({ id, socketId }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      setRemoteStreams(prev => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
    });

    // Listen for WebRTC signals from other peers
    socket.on('webrtc_signal', async ({ senderSocketId, signal }) => {
      try {
        let pc = peerConnections.current[senderSocketId];

        if (signal.sdp) {
          if (signal.sdp.type === 'offer') {
            if (!pc) {
              pc = createPeerConnection(senderSocketId);
            }
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('webrtc_signal', {
              targetSocketId: senderSocketId,
              signal: { sdp: pc.localDescription }
            });
          } else if (signal.sdp.type === 'answer') {
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            }
          }
        } else if (signal.candidate) {
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.error('WebRTC: Error handling signaling candidate/sdp:', err);
      }
    });

    // Listen for host ending the meeting
    socket.on('meeting_ended', () => {
      setMeetingStep('lobby');
      setHostStartedMeeting(false);
      setIsHost(false);
      setHostUserId('');
      setBreakoutRooms([{ id: 'main', name: 'Main Room' }]);
      setActiveRoomId('main');
      setShowBreakoutMenu(false);
      setRemoteStreams({});
      
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      toast.error('The host has ended this meeting.');
    });

    // Listen for real-time meeting chat messages
    socket.on('meeting_chat_message', (msg) => {
      setChatMessages(prev => [
        ...prev,
        {
          sender: msg.senderId === userRef.current?.id ? 'Me' : msg.sender,
          content: msg.content,
          time: msg.time
        }
      ]);
    });

    // Listen for media status updates of other participants
    socket.on('participant_media_state_changed', ({ id, socketId, isMuted, videoOn, isHandRaised }) => {
      setParticipants(prev => prev.map(p => {
        if (p.socketId === socketId) {
          return {
            ...p,
            isMuted: isMuted !== undefined ? isMuted : p.isMuted,
            videoOn: videoOn !== undefined ? videoOn : p.videoOn,
            isHandRaised: isHandRaised !== undefined ? isHandRaised : p.isHandRaised
          };
        }
        return p;
      }));
    });

    // Listen for drawing strokes from other whiteboard participants
    socket.on('draw_stroke', ({ x, y, lastX, lastY, color, size, tool }) => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const currentStroke = ctx.strokeStyle;
        const currentWidth = ctx.lineWidth;
        
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = size;
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.strokeStyle = currentStroke;
        ctx.lineWidth = currentWidth;
      }
    });

    // Listen for clear whiteboard from other participants
    socket.on('clear_whiteboard', () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          toast.success('Whiteboard cleared by another user.');
        }
      }
    });

    // Listen for emoji reactions
    socket.on('reaction_received', ({ senderName, reaction }) => {
      const id = Math.random().toString();
      const x = 10 + Math.random() * 80;
      setFloatingReactions(prev => [...prev, { id, reaction, x }]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 4000);
    });

    return () => {
      socket.off('meeting_started');
      socket.off('guest_request_to_join');
      socket.off('meeting_admission_result');
      socket.off('meeting_active_participants');
      socket.off('participant_joined');
      socket.off('participant_left');
      socket.off('webrtc_signal');
      socket.off('meeting_ended');
      socket.off('meeting_chat_message');
      socket.off('participant_media_state_changed');
      socket.off('draw_stroke');
      socket.off('clear_whiteboard');
      socket.off('reaction_received');
    };
  }, [socket, meetingMuteOnEntry]);

  // Join the persistent, whole-meeting channel for the entire time we're in the
  // call — this is what meeting-wide host controls (end meeting, lock, recording
  // notice, breakout room updates) travel over, independent of which specific
  // room (main or breakout) we're currently in.
  useEffect(() => {
    if (!socket || meetingStep !== 'room') return;
    socket.emit('join_meeting_channel', { meetingId });
    return () => {
      socket.emit('leave_meeting_channel', { meetingId });
    };
  }, [socket, meetingStep, meetingId]);

  // Handle room joining/leaving reactively when meetingStep or activeRoomId changes
  useEffect(() => {
    if (!socket || meetingStep !== 'room') return;

    // Switching rooms (main <-> breakout) means a completely different set of
    // peers — tear down the old room's WebRTC connections and participant list
    // so video/audio don't keep flowing from people who are no longer in our room.
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});
    setParticipants([]);

    const targetRoomId = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;

    socket.emit('join_meeting_room', { meetingId: targetRoomId });

    // Emit initial media state
    socket.emit('update_media_state', { 
      meetingId: targetRoomId, 
      isMuted: !audioOn, 
      videoOn, 
      isHandRaised: handRaised 
    });

    return () => {
      socket.emit('leave_meeting_room', { meetingId: targetRoomId });
    };
  }, [socket, meetingStep, meetingId, activeRoomId]);

  // Isolate chat and clear canvas when active breakout room changes
  useEffect(() => {
    if (meetingStep === 'room') {
      setChatMessages([{ sender: 'System', content: `Welcome to ${activeRoomId === 'main' ? 'Main Room' : breakoutRooms.find(r => r.id === activeRoomId)?.name}!`, time: 'Now' }]);
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [activeRoomId, meetingStep]);

  // Video & Audio togglers
  const toggleVideo = () => {
    const nextState = !videoOn;
    setVideoOn(nextState);
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach(track => track.enabled = nextState);
    }
    if (socket) {
      const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
      socket.emit('update_media_state', { meetingId: room, videoOn: nextState });
    }
    toast.success(nextState ? 'Camera enabled' : 'Camera disabled');
  };

  const toggleAudio = () => {
    const nextState = !audioOn;
    setAudioOn(nextState);
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => track.enabled = nextState);
    }
    if (socket) {
      const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
      socket.emit('update_media_state', { meetingId: room, isMuted: !nextState });
    }
    toast.success(nextState ? 'Microphone unmuted' : 'Microphone muted');
  };

  // Hand Raise toggler
  const toggleHandRaised = () => {
    const nextState = !handRaised;
    setHandRaised(nextState);
    if (socket) {
      const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
      socket.emit('update_media_state', { meetingId: room, isHandRaised: nextState });
    }
    toast.success(nextState ? 'You raised your hand' : 'You lowered your hand');
  };

  // Emoji Reaction Sender
  const sendReaction = (reaction: string) => {
    if (socket) {
      const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
      socket.emit('send_reaction', { meetingId: room, reaction });
    }
    const id = Math.random().toString();
    const x = 10 + Math.random() * 80;
    setFloatingReactions(prev => [...prev, { id, reaction, x }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 4000);
  };

  // Screen Sharing WebRTC capture — actually captures/stops the screen.
  // Hosts can call this directly. Non-hosts must go through
  // handleRequestScreenShare first, which only calls this once approved.
  const toggleScreenSharing = async () => {
    if (screenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setScreenSharing(false);
      toast.success('Stopped screen sharing');
    } else {
      try {
        // getDisplayMedia always shows the browser's native picker (Entire
        // Screen / Window / Tab) — whichever the host picks is the ONLY
        // surface that ever gets captured; nothing else on their device is
        // visible to participants. Requesting audio:true additionally
        // captures that surface's sound where the OS/browser supports it
        // (e.g. sharing a Chrome tab with "Share tab audio" checked).
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        } as MediaStreamConstraints);
        setScreenStream(stream);
        setScreenSharing(true);
        setTimeout(() => {
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = stream;
          }
        }, 300);

        stream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          setScreenStream(null);
        };
        toast.success('Screen sharing started!');
      } catch (err) {
        toast.error('Could not capture screen media.');
      }
    }
  };

  // Entry point for the toolbar button. Hosts always get to present; a guest
  // has to ask the host first (mirrors the join-request admission pattern).
  const handleRequestScreenShare = () => {
    if (screenSharing) {
      toggleScreenSharing(); // stopping never needs permission
      return;
    }
    if (isHost) {
      toggleScreenSharing();
      return;
    }
    if (socket) {
      const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
      socket.emit('request_screen_share_permission', {
        meetingId,
        room,
        guestName: `${user?.firstName} ${user?.lastName || ''}`.trim(),
      });
      setAwaitingScreenSharePermission(true);
      toast('Asking the host for permission to share your screen...', { icon: '🙋' });
    }
  };

  const handleScreenSharePermissionDecision = (req: any, approved: boolean) => {
    if (socket) {
      socket.emit('screen_share_permission_result', { meetingId: req.meetingId, targetSocketId: req.socketId, approved });
    }
    setScreenSharePermissionRequests(prev => prev.filter(r => r.socketId !== req.socketId));
  };

  // Whiteboard drawings handler
  useEffect(() => {
    if (showWhiteboard && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : drawColor;
        ctx.lineWidth = drawSize;
      }
    }
  }, [showWhiteboard, drawColor, drawSize, activeTool]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      lastDrawingPos.current = { x, y };
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !lastDrawingPos.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();

      if (socket) {
        const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
        socket.emit('draw_stroke', {
          meetingId: room,
          x,
          y,
          lastX: lastDrawingPos.current.x,
          lastY: lastDrawingPos.current.y,
          color: drawColor,
          size: drawSize,
          tool: activeTool
        });
      }
      lastDrawingPos.current = { x, y };
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastDrawingPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (socket) {
        const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
        socket.emit('clear_whiteboard', { meetingId: room });
      }
      toast.success('Whiteboard cleared.');
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'connecthub-whiteboard.png';
    link.href = url;
    link.click();
    toast.success('Saved drawing to files.');
  };

  // Meeting recording: only the host may record (matches Meet/Teams — a
  // recording notice is broadcast to everyone the moment it starts, see the
  // socket listener below and the on-screen "REC" banner).
  //
  // This is a peer-to-peer mesh call, not backed by a server-side media mixer,
  // so there is no single server stream to record. The closest honest
  // equivalent to "record everyone" client-side is: capture the meeting TAB
  // itself (which already visually shows every participant's tile, exactly as
  // laid out on screen) via getDisplayMedia, and separately mix every audio
  // source we have — our mic plus every remote participant's audio track —
  // into one track via the Web Audio API, since tab-capture audio alone is
  // unreliable across browsers. Where tab capture isn't supported at all
  // (notably iOS Safari), we fall back to recording our own camera/screen feed
  // and say so, rather than silently producing an incomplete recording.
  const toggleRecording = async () => {
    if (recording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    if (!isHost) {
      toast.error('Only the host can start recording.');
      return;
    }

    try {
      let videoTrack: MediaStreamTrack | null = null;
      let capturedAudioTrack: MediaStreamTrack | null = null;
      const supportsTabCapture = typeof navigator.mediaDevices?.getDisplayMedia === 'function';

      if (supportsTabCapture) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        } as MediaStreamConstraints);
        videoTrack = displayStream.getVideoTracks()[0] || null;
        capturedAudioTrack = displayStream.getAudioTracks()[0] || null;
        recordingCaptureStream.current = displayStream;
        if (videoTrack) {
          // If the host stops sharing via the browser's native "Stop sharing"
          // bar, end the recording cleanly instead of leaving it hanging.
          videoTrack.onended = () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
          };
        }
      } else {
        videoTrack = (screenStream || mediaStream)?.getVideoTracks()[0] || null;
        toast('This browser can\'t capture the full meeting tab — recording your own camera/screen only.', { icon: '⚠️' });
      }

      if (!videoTrack) {
        toast.error('No active video feed to record.');
        return;
      }

      // Mix our mic + every remote participant's audio into one track.
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx: AudioContext = new AudioCtx();
      recordingAudioContext.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();
      const connectAudio = (track: MediaStreamTrack | undefined | null) => {
        if (!track) return;
        try {
          audioCtx.createMediaStreamSource(new MediaStream([track])).connect(destination);
        } catch {
          // Track already released or invalid for this context — skip it.
        }
      };
      connectAudio(mediaStream?.getAudioTracks()[0]);
      connectAudio(capturedAudioTrack);
      Object.values(remoteStreams).forEach(s => connectAudio(s.getAudioTracks()[0]));

      const finalStream = new MediaStream([videoTrack, ...destination.stream.getAudioTracks()]);
      recordingChunks.current = [];

      let options = { mimeType: 'video/webm;codecs=vp9,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm' };
        }
      }

      const recorder = new MediaRecorder(finalStream, options);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `connecthub-meeting-${meetingId}-${new Date().toISOString()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);

        recordingCaptureStream.current?.getTracks().forEach(t => t.stop());
        recordingCaptureStream.current = null;
        recordingAudioContext.current?.close();
        recordingAudioContext.current = null;
        mediaRecorderRef.current = null;
        setMediaRecorder(null);
        setRecording(false);
        toast.success('Meeting recording finalized and downloading!');

        if (socket) {
          // Meeting-wide notice — must reach the whole meeting, not just whichever
          // breakout room the host happens to be recording from.
          socket.emit('recording_state', { meetingId, recording: false });
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setMediaRecorder(recorder);
      setRecording(true);
      toast.success('Meeting recording started...');

      if (socket) {
        socket.emit('recording_state', { meetingId, recording: true });
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Could not start recording — permission denied or unsupported on this device.');
    }
  };

  // Chat message send handler
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    if (socket) {
      const room = activeRoomId === 'main' ? meetingId : `${meetingId}_${activeRoomId}`;
      socket.emit('send_meeting_message', {
        meetingId: room,
        content: chatInput.trim()
      });
    } else {
      setChatMessages(prev => [
        ...prev,
        { sender: 'Me', content: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }
    setChatInput('');
  };

  // `code` matches the query param the backend's .ics / calendar-feed links
  // use (buildIcsCalendar in getMeetingIcs / getCalendarFeed) — keeping this
  // in sync means every link source (in-app "Invite Link" button, calendar
  // download, calendar subscription feed) leads to the same auto-launch
  // behavior in the mount effect above.
  const buildInviteLink = (code: string) => `${window.location.origin}/meetings?code=${code}`;

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(buildInviteLink(code));
    toast.success('Meeting link copied to clipboard!');
  };

  // "Send invite" opens the device's native share sheet (Email/WhatsApp/Slack/etc.)
  // when available, so it behaves like a real invite action rather than a
  // second copy button. Falls back to copy-to-clipboard on unsupported browsers.
  const handleSendInvite = async (code: string) => {
    const inviteLink = buildInviteLink(code);
    const shareData = {
      title: `Join my ${orgSettings.orgName} meeting`,
      text: `Join my meeting on ${orgSettings.orgName}: ${code}`,
      url: inviteLink,
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled the native share sheet, or it failed — fall through to copy.
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    handleCopyLink(code);
  };

  // Breakout Rooms action — anyone can self-select into a room the host has created
  const handleJoinBreakout = (roomId: string) => {
    setActiveRoomId(roomId);
    toast.success(`Joined ${breakoutRooms.find(r => r.id === roomId)?.name}`);
  };

  // Host-only: create a new breakout room and broadcast the updated list to everyone
  const handleAddBreakoutRoom = () => {
    if (!socket || !canModerate) return;
    const name = newBreakoutRoomName.trim() || `Breakout Room ${breakoutRooms.length}`;
    const newRoom = { id: `br-${Date.now()}`, name };
    const updatedRooms = breakoutRooms.filter(r => r.id !== 'main').concat(newRoom);
    socket.emit('update_breakout_rooms', { meetingId, rooms: updatedRooms });
    setNewBreakoutRoomName('');
  };

  // Host or co-host: remove a single breakout room. Anyone currently inside it
  // will be moved back to main automatically once the updated list reaches
  // their client.
  const handleRemoveBreakoutRoom = (roomId: string) => {
    if (!socket || !canModerate) return;
    const updatedRooms = breakoutRooms.filter(r => r.id !== 'main' && r.id !== roomId);
    socket.emit('update_breakout_rooms', { meetingId, rooms: updatedRooms });
  };

  // Host or co-host: close all breakout rooms at once, pulling everyone back to main
  const handleCloseBreakoutRooms = () => {
    if (!socket || !canModerate) return;
    socket.emit('close_breakout_rooms', { meetingId });
    socket.emit('update_breakout_rooms', { meetingId, rooms: [] });
    toast.success('Breakout rooms closed. Everyone has been moved back to the main room.');
  };

  // Lobby actions
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [joiningMeeting, setJoiningMeeting] = useState(false);

  // Employee directory, for the invitee picker when scheduling a meeting
  useEffect(() => {
    api.getDirectory('limit=100')
      .then((data: any) => setDirectoryUsers((data?.users || []).filter((u: any) => u.id !== user?.id)))
      .catch(() => {});
  }, [user?.id]);

  const refetchMyMeetings = () => {
    setLoadingMyMeetings(true);
    api.getMeetings()
      .then((data: any) => setMyMeetings(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingMyMeetings(false));
  };

  useEffect(() => {
    if (meetingStep === 'lobby') refetchMyMeetings();
  }, [meetingStep]);

  // Keep "My Meetings" live: every other page's meeting data is React Query
  // and gets invalidated automatically off the backend's `data_update`
  // broadcast (see MODULE_QUERY_KEYS.meetings in hooks/useSocket.tsx), but
  // this list is plain local state, so it needs its own listener. Without
  // this, a new invite (or a host starting/cancelling a meeting) only shows
  // up here after the invitee navigates away and back — not the moment it
  // actually happens, which is what "shows up in their Meeting section"
  // means for someone with this page open right now.
  useEffect(() => {
    if (!socket) return;
    const handleMeetingsDataUpdate = ({ module }: { module: string }) => {
      if (module === 'meetings' && meetingStep === 'lobby') refetchMyMeetings();
    };
    socket.on('data_update', handleMeetingsDataUpdate);
    return () => { socket.off('data_update', handleMeetingsDataUpdate); };
  }, [socket, meetingStep]);

  const toggleScheduleInvitee = (userId: string) => {
    setScheduleInviteeIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    // A co-host has to actually be invited — if they're being unchecked as an
    // invitee, drop any co-host designation along with it.
    setScheduleCoHostIds(prev => prev.filter(id => id !== userId));
  };

  const toggleScheduleCoHost = (userId: string) => {
    setScheduleCoHostIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleScheduleMeeting = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error('Pick a date and time for the meeting.');
      return;
    }
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
    if (isNaN(scheduledFor.getTime())) {
      toast.error('That date/time isn\'t valid.');
      return;
    }
    if (scheduledFor.getTime() < Date.now() - 60_000) {
      toast.error('Pick a time in the future.');
      return;
    }

    if (scheduleRecurrenceRule && !scheduleRecurrenceEndDate) {
      toast.error('Pick when the recurring series should stop.');
      return;
    }

    setScheduling(true);
    try {
      const result: any = await api.scheduleMeeting({
        title: scheduleTitle.trim() || undefined,
        scheduledFor: scheduledFor.toISOString(),
        durationMins: parseInt(scheduleDuration, 10) || 30,
        inviteeIds: scheduleInviteeIds,
        recurrenceRule: scheduleRecurrenceRule || undefined,
        recurrenceEndDate: scheduleRecurrenceRule && scheduleRecurrenceEndDate ? new Date(scheduleRecurrenceEndDate).toISOString() : undefined,
        coHostIds: scheduleCoHostIds,
        muteOnEntry: scheduleMuteOnEntry,
      });
      const occurrences = result?.occurrencesCreated || 1;
      toast.success(
        occurrences > 1
          ? `${occurrences} occurrences scheduled${scheduleInviteeIds.length > 0 ? ' and invites sent' : ''}!`
          : scheduleInviteeIds.length > 0 ? 'Meeting scheduled and invites sent!' : 'Meeting scheduled!'
      );
      setShowScheduleModal(false);
      setScheduleTitle('');
      setScheduleDate('');
      setScheduleTime('');
      setScheduleDuration('30');
      setScheduleInviteeIds([]);
      setScheduleCoHostIds([]);
      setScheduleMuteOnEntry(false);
      setScheduleRecurrenceRule('');
      setScheduleRecurrenceEndDate('');
      refetchMyMeetings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule the meeting.');
    } finally {
      setScheduling(false);
    }
  };

  const handleInviteResponse = async (meetingRowId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setRespondingInviteId(meetingRowId);
    try {
      await api.respondToMeetingInvite(meetingRowId, status);
      toast.success(status === 'ACCEPTED' ? 'Invite accepted.' : 'Invite declined.');
      refetchMyMeetings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to respond to the invite.');
    } finally {
      setRespondingInviteId('');
    }
  };

  const [cancellingMeetingId, setCancellingMeetingId] = useState('');
  const [downloadingIcsId, setDownloadingIcsId] = useState('');
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscribingFeed, setSubscribingFeed] = useState(false);
  const [feedUrls, setFeedUrls] = useState<{ feedUrl: string; webcalUrl: string } | null>(null);
  const handleGetCalendarFeed = async () => {
    setShowSubscribeModal(true);
    if (feedUrls) return; // already fetched this session, no need to regenerate every open
    setSubscribingFeed(true);
    try {
      const result = await api.regenerateCalendarFeedToken();
      setFeedUrls(result);
    } catch (err: any) {
      toast.error(err.message || 'Failed to set up your calendar subscription.');
      setShowSubscribeModal(false);
    } finally {
      setSubscribingFeed(false);
    }
  };
  const handleRegenerateFeed = async () => {
    setSubscribingFeed(true);
    try {
      const result = await api.regenerateCalendarFeedToken();
      setFeedUrls(result);
      toast.success('New link generated — the old one no longer works.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate your calendar link.');
    } finally {
      setSubscribingFeed(false);
    }
  };

  const handleDownloadIcs = async (meeting: any) => {
    setDownloadingIcsId(meeting.id);
    try {
      await api.downloadMeetingIcs(meeting.id, meeting.code);
    } catch (err: any) {
      toast.error(err.message || 'Failed to download this meeting.');
    } finally {
      setDownloadingIcsId('');
    }
  };

  const handleCancelMeeting = async (meeting: any) => {
    const ok = await confirm({
      title: 'Cancel Meeting',
      message: `Cancel "${meeting.title || 'this meeting'}"? Everyone invited will be able to see it was cancelled.`,
      confirmText: 'Cancel Meeting',
      type: 'danger',
    });
    if (!ok) return;

    // useConfirm only ever resolves true/false, so a recurring meeting
    // needs a second, separate confirm rather than trying to squeeze a
    // three-way answer (cancel series / cancel one / do nothing) out of one
    // dialog — dismissing this second one safely falls back to the less
    // destructive choice (just this occurrence), not the whole series.
    let scope: 'occurrence' | 'series' = 'occurrence';
    if (meeting.recurrenceRule) {
      const cancelSeries = await confirm({
        title: 'Cancel the Whole Series?',
        message: `This meeting repeats ${meeting.recurrenceRule.toLowerCase()}. Cancel every future occurrence too, or just this one?`,
        confirmText: 'Cancel Whole Series',
        cancelText: 'Just This One',
        type: 'danger',
      });
      scope = cancelSeries ? 'series' : 'occurrence';
    }

    setCancellingMeetingId(meeting.id);
    try {
      const result: any = await api.cancelMeeting(meeting.id, scope);
      toast.success(scope === 'series' ? `Series cancelled (${result?.cancelledCount || ''} occurrences).` : 'Meeting cancelled.');
      refetchMyMeetings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel the meeting.');
    } finally {
      setCancellingMeetingId('');
    }
  };

  // Host starting a meeting they scheduled earlier (as opposed to the instant
  // "New meeting" flow, which goes through the share-modal + handleStartCreatedMeeting).
  const handleStartScheduledMeeting = async (meeting: any) => {
    const code = meeting.code;
    try {
      await api.startMeeting(code);
    } catch (err: any) {
      toast.error(err.message || 'Could not start the meeting.');
      return;
    }
    const iAmHost = meeting.hostId === user?.id;
    setMeetingId(code);
    setHostUserId(meeting.hostId);
    // A co-host starting the meeting stays a co-host, not the host — isCoHost
    // picks this up automatically from coHostIds via the derivation effect.
    setIsHost(iAmHost);
    setCoHostIds(meeting.coHostIds || []);
    setMeetingMuteOnEntry(!!meeting.muteOnEntry);
    setHostStartedMeeting(true);
    setMeetingStartedAt(new Date());
    setMeetingStep('room');
    if (socket) {
      socket.emit('start_meeting', { meetingId: code });
    }
    toast.success(iAmHost ? 'Meeting started successfully as host.' : 'Meeting started successfully as co-host.');
  };

  const handleCreateMeeting = async () => {
    try {
      setCreatingMeeting(true);
      const meeting = await api.createMeeting();
      setNewMeetingCode(meeting.code);
      setMeetingId(meeting.code);
      setHostUserId(meeting.hostId);
      setShowShareModal(true);
    } catch (err: any) {
      toast.error(err.message || 'Could not create the meeting. Please try again.');
    } finally {
      setCreatingMeeting(false);
    }
  };

  useEffect(() => {
    if (socket && meetingStep === 'waiting' && meetingId) {
      socket.emit('join_meeting_lobby', { meetingId });

      // If we already know (via the REST lookup in handleJoinExisting) that the
      // meeting is live, request entry right away instead of waiting on the
      // socket round-trip.
      if (hostStartedMeeting) {
        setWaitingStatus('asking');
        socket.emit('request_to_join_meeting', { 
          meetingId, 
          guestName: `${user?.firstName} ${user?.lastName || ''}` 
        });
      } else {
        setWaitingStatus('not_started');
      }
    }
  }, [socket, meetingStep, meetingId, hostStartedMeeting, user]);

  // Accepts either a bare code ("abc-defg-hij") or a full pasted invite link
  // (".../meetings?code=abc-defg-hij", or the older "?joinCode=..." form) —
  // Google Meet/Teams both let you paste either into the same box.
  const extractMeetingCode = (input: string): string => {
    const trimmed = input.trim();
    try {
      const url = new URL(trimmed);
      const codeFromUrl = url.searchParams.get('code') || url.searchParams.get('joinCode');
      if (codeFromUrl) return codeFromUrl.trim().toLowerCase();
    } catch {
      // Not a URL — treat the whole input as a raw code.
    }
    return trimmed.toLowerCase();
  };

  const handleJoinExisting = async (codeOverride?: string) => {
    const code = extractMeetingCode(codeOverride ?? meetingId);
    if (!code) {
      toast.error('Please enter a valid meeting code or link.');
      return;
    }

    try {
      setJoiningMeeting(true);
      // Validate the code against the DB *before* showing the waiting screen.
      // This is what turns "typo'd code -> stuck spinner forever" into an
      // immediate, honest error, and it guarantees the exact-cased code string
      // we hand to the socket layer matches what the host is broadcasting on.
      const meeting = await api.getMeetingByCode(code);

      if (meeting.status === 'CANCELLED') {
        toast.error('This meeting has been cancelled by the host.');
        return;
      }

      // If the current user IS this meeting's host (e.g. clicking "Join" on
      // their own already-live meeting from the My Meetings list, or
      // reconnecting after a dropped connection), keep them as host rather
      // than dropping them into the guest waiting room — otherwise they'd
      // silently lose host controls (end for everyone, lock, admit requests)
      // on their own call. A co-host gets the same "can start it" treatment
      // (Meet/Teams "co-organizer can start" parity) but keeps co-host
      // status rather than becoming host.
      const iAmHost = !!user && meeting.hostId === user.id;
      const iAmCoHost = !iAmHost && !!user && (meeting.coHostIds || []).includes(user.id);
      setMeetingId(meeting.code);
      setHostUserId(meeting.hostId);
      setCoHostIds(meeting.coHostIds || []);
      setMeetingMuteOnEntry(!!meeting.muteOnEntry);

      if (iAmHost || iAmCoHost) {
        setIsHost(iAmHost);
        if (meeting.status === 'LIVE') {
          setHostStartedMeeting(true);
          setMeetingStartedAt(meeting.startedAt ? new Date(meeting.startedAt) : new Date());
          setMeetingStep('room');
        } else {
          setNewMeetingCode(meeting.code);
          setShowShareModal(true);
        }
      } else {
        setIsHost(false);
        setHostStartedMeeting(meeting.status === 'LIVE');
        setMeetingStartedAt(meeting.startedAt ? new Date(meeting.startedAt) : null);
        setMeetingStep('waiting');
      }
    } catch (err: any) {
      toast.error(err.message || 'No meeting found with that code. Double-check it and try again.');
    } finally {
      setJoiningMeeting(false);
    }
  };

  // Start Meeting as Host
  const handleStartCreatedMeeting = async () => {
    try {
      await api.startMeeting(newMeetingCode);
    } catch (err: any) {
      toast.error(err.message || 'Could not start the meeting.');
      return;
    }

    // hostUserId was set correctly (to the meeting's real host, not
    // necessarily this user) by whichever flow opened this share modal — an
    // instant "New meeting" always makes the creator the host, but a
    // co-host opening a not-yet-started meeting's link lands here too.
    const iAmHost = !hostUserId || hostUserId === user?.id;
    setShowShareModal(false);
    setIsHost(iAmHost);
    setHostStartedMeeting(true);
    setMeetingStartedAt(new Date());
    setMeetingStep('room');

    if (socket) {
      socket.emit('start_meeting', { meetingId: newMeetingCode });
    }
    toast.success(iAmHost ? 'Meeting started successfully as host.' : 'Meeting started successfully as co-host.');
  };

  // Host Action: Accept or Cancel a guest entry request
  const handleAdmitRequest = (reqId: string, accept: boolean) => {
    setJoinRequests(prev => prev.filter(r => r.id !== reqId));
    if (socket) {
      socket.emit('admit_meeting_guest', { 
        meetingId, 
        guestSocketId: reqId, 
        admit: accept 
      });
    }
    if (accept) {
      toast.success('Guest admitted.');
    } else {
      toast.error('Guest denied.');
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col bg-card dark:bg-card dark:bg-card p-3 sm:p-8 h-[calc(100vh-4rem)] ${
        meetingStep === 'lobby' ? 'overflow-y-auto' : 'overflow-hidden'
      }`}
    >
      
      {/* Resolving a ?code= link (calendar invite, feed entry, pasted link) —
          shown instead of the lobby form so opening a meeting link goes
          straight through to the meeting rather than flashing the "New
          meeting / Join a meeting" screen first. */}
      {meetingStep === 'lobby' && resolvingLinkCode && (
        <div className="flex-grow flex flex-col items-center justify-center gap-3 text-muted-foreground dark:text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs font-semibold">Opening your meeting...</p>
        </div>
      )}

      {/* GOOGLE MEET LOBBY SCREEN */}
      {meetingStep === 'lobby' && !resolvingLinkCode && (
        <div className="flex-grow flex flex-col lg:flex-row items-center lg:items-start justify-center max-w-6xl mx-auto w-full gap-12 lg:gap-24 lg:pt-10 pb-10">
          
          {/* LEFT SIDE: GOOGLE MEET CONFIG PANEL */}
          <div className="w-full lg:w-1/2 space-y-12 text-left animate-in fade-in duration-300">
            <div className="flex items-center space-x-3 select-none">
              <h2 className="text-3xl font-normal text-foreground dark:text-foreground font-sans tracking-tight font-light">Meet</h2>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl lg:text-3xl font-light leading-snug text-foreground dark:text-foreground">
                Premium video meetings.<br />Now free for everyone in the workspace.
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground max-w-md leading-relaxed">
                Connect, collaborate, and celebrate from anywhere with {orgSettings.orgName} Meetings. No permission prompts are sent until you join.
              </p>
            </div>

            {/* Meet buttons and Input box */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleCreateMeeting}
                disabled={creatingMeeting}
                className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:opacity-60 text-primary-foreground font-medium text-sm rounded-xl shadow-md shadow-primary/15 transition-all flex items-center space-x-2"
              >
                {creatingMeeting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Video className="h-4.5 w-4.5" />}
                <span>New meeting</span>
              </button>

              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-6 py-3 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card text-foreground dark:text-foreground font-medium text-sm rounded-xl transition-all flex items-center space-x-2"
              >
                <Calendar className="h-4.5 w-4.5" />
                <span>Schedule</span>
              </button>

              <button
                onClick={handleGetCalendarFeed}
                className="px-4 py-3 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card text-foreground dark:text-foreground font-medium text-sm rounded-xl transition-all flex items-center space-x-2"
                title="Subscribe to your meetings from Google Calendar, Outlook, or Apple Calendar"
              >
                <Rss className="h-4.5 w-4.5" />
                <span>Sync to Calendar App</span>
              </button>

              {/* Unified code-entry pill: icon + input + attached Join action, so
                  the join button is always visible rather than appearing/disappearing. */}
              <div className="flex items-center bg-muted dark:bg-card border border-border dark:border-border rounded-xl pl-3.5 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <Laptop className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Enter a code or link"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && meetingId.trim() && !joiningMeeting) handleJoinExisting(); }}
                  className="bg-transparent text-sm font-semibold outline-none w-44 sm:w-52 px-3 py-1.5 text-foreground dark:text-foreground placeholder:font-normal placeholder:text-muted-foreground"
                />
                <button
                  onClick={() => handleJoinExisting()}
                  disabled={!meetingId.trim() || joiningMeeting}
                  className="px-4 py-2 text-primary font-bold text-xs enabled:hover:bg-primary/10 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 shrink-0"
                >
                  {joiningMeeting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Join</span>
                </button>
              </div>
            </div>

            <hr className="border-border dark:border-border max-w-md" />

            {/* My Meetings & Scheduled badge */}
            <div className="space-y-3 select-none max-w-md">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">My Meetings</span>

              {loadingMyMeetings ? (
                <div className="flex items-center space-x-2 text-muted-foreground text-xs px-4 py-3.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading your meetings...</span>
                </div>
              ) : (() => {
                const upcoming = myMeetings
                  .filter((m: any) => m.status !== 'ENDED' && m.status !== 'CANCELLED' && m.scheduledFor)
                  .sort((a: any, b: any) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
                  .slice(0, 5);

                if (upcoming.length === 0) {
                  return (
                    <div className="flex items-center space-x-3 text-muted-foreground text-xs bg-muted dark:bg-card border border-dashed border-border dark:border-border rounded-xl px-4 py-3.5">
                      <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                      <p>Nothing scheduled yet. Click "Schedule" to book a meeting and invite teammates.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {upcoming.map((m: any) => {
                      const when = new Date(m.scheduledFor).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                      const isLive = m.status === 'LIVE';
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-3 bg-muted dark:bg-card border border-border dark:border-border rounded-xl px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground dark:text-foreground truncate">
                              {m.title || 'Untitled Meeting'}
                              {isLive && <span className="ml-2 text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded align-middle">LIVE</span>}
                              {m.recurrenceRule && (
                                <span className="ml-2 text-[9px] font-black text-muted-foreground bg-muted dark:bg-card px-1.5 py-0.5 rounded align-middle capitalize">
                                  Repeats {m.recurrenceRule.toLowerCase()}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {when} {m.isHost ? '· You\'re hosting' : m.isCoHost ? '· You\'re a co-host' : `· Hosted by ${m.host?.firstName} ${m.host?.lastName}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {m.status !== 'CANCELLED' && (
                              <button
                                disabled={downloadingIcsId === m.id}
                                onClick={() => handleDownloadIcs(m)}
                                title="Add to your calendar app (.ics)"
                                aria-label={`Add ${m.title || 'meeting'} to calendar`}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted dark:hover:bg-card rounded-lg transition-all disabled:opacity-50"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {m.isHost ? (
                              <>
                                <button
                                  onClick={() => isLive ? handleJoinExisting(m.code) : handleStartScheduledMeeting(m)}
                                  className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground rounded-lg text-[10px] font-bold transition-all"
                                >
                                  {isLive ? 'Join' : 'Start'}
                                </button>
                                {!isLive && (
                                  <button
                                    disabled={cancellingMeetingId === m.id}
                                    onClick={() => handleCancelMeeting(m)}
                                    title="Cancel meeting"
                                    aria-label={`Cancel ${m.title || 'meeting'}`}
                                    className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </>
                            ) : m.myInviteStatus === 'DECLINED' ? (
                              <span className="text-[10px] font-bold text-muted-foreground px-2">Declined</span>
                            ) : m.myInviteStatus === 'PENDING' ? (
                              <>
                                <button
                                  disabled={respondingInviteId === m.id}
                                  onClick={() => handleInviteResponse(m.id, 'ACCEPTED')}
                                  className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold transition-all"
                                >
                                  Accept
                                </button>
                                <button
                                  disabled={respondingInviteId === m.id}
                                  onClick={() => handleInviteResponse(m.id, 'DECLINED')}
                                  className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold transition-all"
                                >
                                  Decline
                                </button>
                              </>
                            ) : m.isCoHost ? (
                              // Co-hosts (Meet "co-organizer" parity) can start the
                              // meeting themselves once they've accepted the invite —
                              // just without the host-only Cancel option.
                              <button
                                onClick={() => isLive ? handleJoinExisting(m.code) : handleStartScheduledMeeting(m)}
                                className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground rounded-lg text-[10px] font-bold transition-all"
                              >
                                {isLive ? 'Join' : 'Start'}
                              </button>
                            ) : isLive ? (
                              <button
                                onClick={() => handleJoinExisting(m.code)}
                                className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground rounded-lg text-[10px] font-bold transition-all"
                              >
                                Join
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground px-2">Not started yet</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* RIGHT SIDE: ILLUSTRATION & SAFE BANNER */}
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center space-y-6 text-center select-none">
            {/* Styled lock & avatars illustration badge */}
            <div className="relative h-64 w-64 flex items-center justify-center">
              <div className="absolute inset-0 bg-muted/60 dark:bg-card/60 rounded-full blur-2xl" />
              {/* Illustrated Center Graphic */}
              <div className="relative bg-primary/5 dark:bg-card/50 border border-border dark:border-border/60 p-8 rounded-full h-48 w-48 flex items-center justify-center shadow-inner">
                {/* Users facing each other */}
                <div className="absolute left-6 bottom-8 w-16 h-16 rounded-full bg-yellow-500 text-foreground font-black text-lg flex items-center justify-center shadow-md animate-pulse">
                  SC
                </div>
                <div className="absolute right-6 bottom-8 w-16 h-16 rounded-full bg-emerald-500 text-foreground font-black text-lg flex items-center justify-center shadow-md animate-pulse delay-500">
                  ER
                </div>
                
                {/* Shield badge */}
                <div className="p-4 bg-primary text-primary-foreground rounded-2xl shadow-lg border border-primary-light animate-bounce">
                  <Lock className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="space-y-2 max-w-sm">
              <h4 className="text-xl font-medium text-foreground dark:text-foreground">Your meeting is safe</h4>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed">
                No one can join a meeting unless invited or admitted by the host
              </p>
            </div>
          </div>

        </div>
      )}

      {/* SHARE YOUR NEW MEETING MODAL */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative text-left max-h-[85vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowScheduleModal(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-medium text-foreground dark:text-foreground">Schedule a meeting</h3>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">Pick a time and invite teammates — they'll get a notification.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Title (optional)</label>
                <input
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  placeholder="e.g. Weekly sync"
                  className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Duration</label>
                <select
                  value={scheduleDuration}
                  onChange={(e) => setScheduleDuration(e.target.value)}
                  className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Repeats</label>
                <select
                  value={scheduleRecurrenceRule}
                  onChange={(e) => setScheduleRecurrenceRule(e.target.value)}
                  className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                >
                  <option value="">Doesn't repeat</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Every 2 weeks</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              {scheduleRecurrenceRule && (
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Repeat Until</label>
                  <input
                    type="date"
                    value={scheduleRecurrenceEndDate}
                    min={scheduleDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setScheduleRecurrenceEndDate(e.target.value)}
                    className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Capped at {52} occurrences either way.</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">
                  Invite teammates {scheduleInviteeIds.length > 0 && `(${scheduleInviteeIds.length} selected)`}
                </label>
                <div className="border rounded-xl max-h-40 overflow-y-auto divide-y divide-border dark:divide-border">
                  {directoryUsers.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic px-3 py-3">No teammates found.</p>
                  ) : (
                    directoryUsers.map((emp: any) => {
                      const invited = scheduleInviteeIds.includes(emp.id);
                      return (
                      <div key={emp.id} className="flex items-center justify-between gap-2.5 px-3 py-2 hover:bg-muted dark:hover:bg-card">
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={invited}
                            onChange={() => toggleScheduleInvitee(emp.id)}
                            className="rounded shrink-0"
                          />
                          <span className="text-xs font-semibold text-foreground dark:text-foreground truncate">{emp.firstName} {emp.lastName}</span>
                        </label>
                        {/* Co-host designation — only makes sense once they're
                            actually invited (Meet/Teams "co-organizer" parity). */}
                        {invited && (
                          <button
                            type="button"
                            onClick={() => toggleScheduleCoHost(emp.id)}
                            title={scheduleCoHostIds.includes(emp.id) ? 'Remove co-host' : 'Make co-host'}
                            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all ${
                              scheduleCoHostIds.includes(emp.id)
                                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                                : 'text-muted-foreground hover:bg-secondary dark:hover:bg-card'
                            }`}
                          >
                            <Crown className="h-3 w-3" /> Co-host
                          </button>
                        )}
                      </div>
                      );
                    })
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleMuteOnEntry}
                  onChange={(e) => setScheduleMuteOnEntry(e.target.checked)}
                  className="rounded"
                />
                <span className="text-xs font-semibold text-foreground dark:text-foreground">Mute participants on entry</span>
              </label>

              <button
                onClick={handleScheduleMeeting}
                disabled={scheduling || !scheduleDate || !scheduleTime}
                className="w-full py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-primary-foreground text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {scheduling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Schedule Meeting</span>
              </button>
            </motion.div>
          </div>
        )}

        {showShareModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-sm space-y-6 shadow-2xl relative text-center"
            >
              <button 
                onClick={() => setShowShareModal(false)} 
                className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground dark:text-foreground">Share your new meeting</h3>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed">
                  Copy this link and send it to people you want to meet with. Be sure you save it so you can use it later, too.
                </p>
              </div>

              {/* Full, unclipped invite link — wraps instead of ellipsizing so the whole URL is visible/selectable */}
              <div className="flex items-start justify-between gap-2 bg-muted dark:bg-card px-4 py-3 rounded-xl border border-border dark:border-border text-left">
                <span className="text-[11px] font-semibold text-foreground dark:text-foreground break-all select-all leading-relaxed">
                  {buildInviteLink(newMeetingCode)}
                </span>
                <button 
                  onClick={() => handleCopyLink(newMeetingCode)}
                  className="p-1 hover:bg-secondary dark:hover:bg-card rounded-lg text-muted-foreground dark:text-muted-foreground transition-all shrink-0"
                  title="Copy link"
                >
                  <Copy className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                <span className="px-2 py-0.5 bg-muted dark:bg-card rounded-md font-mono normal-case">{newMeetingCode}</span>
                <span>is your meeting code</span>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={() => handleSendInvite(newMeetingCode)}
                  className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-primary-foreground font-medium text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Send invite</span>
                </button>

                <button
                  onClick={handleStartCreatedMeeting}
                  className="px-4 py-2.5 border border-border dark:border-border hover:bg-muted dark:hover:bg-card text-primary font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition-all"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>Start now</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CALENDAR SUBSCRIPTION MODAL */}
      {showSubscribeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label="Sync to Calendar App">
          <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowSubscribeModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1.5 rounded-lg"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center gap-2"><Rss className="h-4 w-4 text-primary" /> Sync to Your Calendar App</h3>
              <p className="text-xs text-muted-foreground">
                Paste this link into Google Calendar, Outlook, or Apple Calendar as a subscription — new meetings
                you're invited to will show up automatically, no manual export needed.
              </p>
            </div>

            {subscribingFeed && !feedUrls ? (
              <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : feedUrls ? (
              <>
                <div className="flex items-start justify-between gap-2 bg-muted dark:bg-card px-4 py-3 rounded-xl border text-left">
                  <span className="text-[11px] font-semibold text-foreground dark:text-foreground break-all select-all leading-relaxed">
                    {feedUrls.feedUrl}
                  </span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(feedUrls.feedUrl); toast.success('Copied!'); }}
                    className="p-1 hover:bg-secondary dark:hover:bg-card rounded-lg text-muted-foreground dark:text-muted-foreground transition-all shrink-0"
                    title="Copy link"
                  >
                    <Copy className="h-4.5 w-4.5" />
                  </button>
                </div>
                <a
                  href={feedUrls.webcalUrl}
                  className="block text-center px-4 py-2.5 bg-primary hover:bg-primary-dark text-primary-foreground font-medium text-xs rounded-xl shadow-md transition-all"
                >
                  Open directly in my calendar app
                </a>
                <button
                  onClick={handleRegenerateFeed}
                  disabled={subscribingFeed}
                  className="w-full text-center text-[10px] font-bold text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  Link not working, or shared by mistake? Generate a new one
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* WAITING ROOM / PERMISSIONS GATEWAY */}
      {meetingStep === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto space-y-6 text-center animate-fade-in py-12">
          
          {/* CASE A: MEETING HAS NOT YET STARTED */}
          {!hostStartedMeeting ? (
            <div className="space-y-6 w-full animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto p-5 bg-amber-500/10 text-amber-500 rounded-full inline-block animate-pulse">
                <AlertCircle className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground dark:text-foreground">Meeting not started by host</h2>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  The host has not started this meeting workspace yet. You will automatically enter the room as soon as the host starts the call.
                </p>
              </div>
              
              <div className="bg-muted dark:bg-card border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-left">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Target Room</span>
                  <p className="text-xs font-bold text-foreground dark:text-foreground">{meetingId}</p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-muted-foreground dark:text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Watching for host to start...</span>
                </div>
              </div>
            </div>
          ) : (
            /* CASE B: MEETING IS ACTIVE - REQUESTING ACCESS */
            <div className="space-y-6 w-full animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto p-5 bg-primary/10 text-primary rounded-full inline-block">
                <Users className="h-10 w-10 animate-bounce" />
              </div>
              
              {waitingStatus === 'asking' && (
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-foreground dark:text-foreground">Asking to join call...</h2>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Host is reviewing your entry request. Camera and audio access will be activated upon host approval.
                  </p>
                </div>
              )}

              {waitingStatus === 'denied' && (
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-red-500">Entry Request Cancelled</h2>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    The host has denied your request to join this session.
                  </p>
                </div>
              )}

              <div className="p-4 bg-muted dark:bg-card border rounded-2xl w-full flex items-center justify-between text-left">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground block uppercase tracking-wide">Target Room</span>
                  <p className="text-xs font-bold text-foreground dark:text-foreground">{meetingId}</p>
                </div>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>

              <button
                onClick={() => setMeetingStep('lobby')}
                className="text-xs text-muted-foreground hover:text-muted-foreground underline block mx-auto pt-2"
              >
                Back to lobby
              </button>
            </div>
          )}

        </div>
      )}

      {/* MEETING ROOM WORKSPACE */}
      {meetingStep === 'room' && (
        <div className="flex-grow flex gap-4 overflow-hidden relative animate-in fade-in duration-300">
          
          {/* Main call canvas viewport */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden relative">

            {/* Floating emoji reactions container */}
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
              <AnimatePresence>
                {floatingReactions.map(r => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: '80%', scale: 0.5, x: `${r.x}%` }}
                    animate={{ opacity: 1, y: '10%', scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 3, ease: 'easeOut' }}
                    className="absolute text-3xl select-none"
                    style={{ left: 0 }}
                  >
                    {r.reaction}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {/* Header info */}
            <div className="flex items-center justify-between bg-card dark:bg-card border px-6 py-3 rounded-2xl shadow-xs">
              <div className="flex items-center space-x-2.5">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${recordingNotice ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <div className="text-left">
                  <h3 className="text-xs font-black text-foreground dark:text-foreground uppercase tracking-wide">
                    Live Session ({activeRoomId === 'main' ? 'Main Room' : breakoutRooms.find(r => r.id === activeRoomId)?.name})
                  </h3>
                  <p className="text-[10px] text-muted-foreground flex items-center space-x-1.5 mt-0.5">
                    <span className="font-semibold text-primary bg-primary/10 dark:bg-card px-1.5 py-0.5 rounded">
                      {participants.length + 1} participant{participants.length + 1 > 1 ? 's' : ''}
                    </span>
                    {meetingStartedAt && (
                      <span className="font-mono font-semibold text-muted-foreground">
                        {String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:{String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:{String(elapsedSeconds % 60).padStart(2, '0')}
                      </span>
                    )}
                    <span>| Room Code: {meetingId}</span>
                    {recordingNotice && (
                      <span className="font-black text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                        <span>REC · {recordingNotice.byName} is recording</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {isHost && joinRequests.length > 1 && (
                  <button
                    onClick={handleAdmitAllRequests}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1"
                  >
                    <Users className="h-3 w-3" />
                    <span>Admit all ({joinRequests.length})</span>
                  </button>
                )}

                {canModerate && (
                  <button
                    onClick={() => setShowCreatePollModal(true)}
                    title="Create a poll"
                    className="p-2 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card rounded-xl text-foreground dark:text-foreground transition-all"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  onClick={() => setViewMode(prev => prev === 'grid' ? 'speaker' : 'grid')}
                  title={viewMode === 'grid' ? 'Switch to speaker view' : 'Switch to grid view'}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'speaker' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-secondary text-foreground'}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={handleToggleFullscreen}
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  className="p-2 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card rounded-xl text-foreground dark:text-foreground transition-all"
                >
                  {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>

                <button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  title="Keyboard shortcuts"
                  className="p-2 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card rounded-xl text-foreground dark:text-foreground transition-all"
                >
                  <Keyboard className="h-3.5 w-3.5" />
                </button>

                {canModerate && (
                  <button
                    onClick={handleToggleMeetingLock}
                    title={meetingLocked ? 'Unlock meeting' : 'Lock meeting (no new joins)'}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1 ${
                      meetingLocked ? 'bg-amber-500 hover:bg-amber-600 text-foreground' : 'bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card text-foreground dark:text-foreground'
                    }`}
                  >
                    {meetingLocked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                    <span>{meetingLocked ? 'Locked' : 'Lock'}</span>
                  </button>
                )}

                <button
                  onClick={() => handleCopyLink(meetingId)}
                  className="px-3 py-1.5 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card rounded-xl text-[10px] font-bold transition-all text-foreground dark:text-foreground flex items-center space-x-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>Invite Link</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowBreakoutMenu(!showBreakoutMenu)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1 ${
                      showBreakoutMenu ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-secondary text-foreground'
                    }`}
                  >
                    <Compass className="h-3 w-3" />
                    <span>Breakout Rooms</span>
                  </button>

                  {/* Breakout rooms menu */}
                  {showBreakoutMenu && (
                    <div className="absolute right-0 top-9 bg-card dark:bg-card border rounded-2xl shadow-xl p-3 w-56 z-40 space-y-2 text-left animate-fade-in">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block border-b pb-1">Rooms</span>

                      {breakoutRooms.map((room) => (
                        <div key={room.id} className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              handleJoinBreakout(room.id);
                              setShowBreakoutMenu(false);
                            }}
                            className={`flex-1 text-left px-2 py-1.5 rounded-lg text-xs font-semibold block transition-all truncate ${
                              activeRoomId === room.id 
                                ? 'bg-primary/10 text-primary font-bold' 
                                : 'hover:bg-muted dark:hover:bg-card'
                            }`}
                          >
                            {room.name}
                          </button>
                          {canModerate && room.id !== 'main' && (
                            <button
                              onClick={() => handleRemoveBreakoutRoom(room.id)}
                              title="Remove room"
                              className="p-1 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}

                      {!canModerate && breakoutRooms.length === 1 && (
                        <p className="text-[10px] text-muted-foreground italic px-2 py-1">The host hasn't created any breakout rooms yet.</p>
                      )}

                      {canModerate && (
                        <div className="border-t pt-2 space-y-1.5">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={newBreakoutRoomName}
                              onChange={(e) => setNewBreakoutRoomName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddBreakoutRoom(); }}
                              placeholder={`Breakout Room ${breakoutRooms.length}`}
                              className="flex-1 min-w-0 bg-muted dark:bg-card border rounded-lg px-2 py-1 text-[10px] text-foreground focus:outline-none"
                            />
                            <button
                              onClick={handleAddBreakoutRoom}
                              title="Add room"
                              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 shrink-0"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          {breakoutRooms.length > 1 && (
                            <button
                              onClick={handleCloseBreakoutRooms}
                              className="w-full text-center px-2 py-1.5 rounded-lg text-[10px] font-bold bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
                            >
                              Close All Breakout Rooms
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Video participants panel & Screen Share / Whiteboard block */}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
              
              {/* Whiteboard module */}
              {showWhiteboard ? (
                <div className="lg:col-span-2 bg-card dark:bg-card border rounded-3xl p-4 flex flex-col gap-3 min-h-[300px]">
                  <div className="flex items-center justify-between border-b pb-2 select-none">
                    <span className="text-xs font-black text-foreground dark:text-foreground uppercase tracking-wider">Collaboration Whiteboard</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setActiveTool('pen')}
                        className={`p-1.5 rounded-lg ${activeTool === 'pen' ? 'bg-primary/10 text-primary' : 'hover:bg-muted dark:hover:bg-card text-muted-foreground'}`}
                        title="Pen Tool"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setActiveTool('eraser')}
                        className={`p-1.5 rounded-lg ${activeTool === 'eraser' ? 'bg-primary/10 text-primary' : 'hover:bg-muted dark:hover:bg-card text-muted-foreground'}`}
                        title="Eraser Tool"
                      >
                        <Eraser className="h-4 w-4" />
                      </button>
                      <button onClick={clearCanvas} className="p-1.5 hover:bg-muted dark:hover:bg-card rounded-lg text-muted-foreground" title="Clear Canvas">
                        <X className="h-4 w-4" />
                      </button>
                      <button onClick={downloadCanvas} className="p-1.5 hover:bg-muted dark:hover:bg-card rounded-lg text-muted-foreground" title="Save Drawing">
                        <Download className="h-4 w-4" />
                      </button>
                      <button onClick={() => setShowWhiteboard(false)} className="p-1.5 hover:bg-muted dark:hover:bg-card rounded-lg text-muted-foreground" title="Close Whiteboard">
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={300}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="flex-1 w-full border bg-muted rounded-2xl cursor-crosshair touch-none text-foreground dark:text-foreground"
                  />
                </div>
              ) : null}

              {/* Screen Share panel (your own) */}
              {screenSharing ? (
                <div className="lg:col-span-2 bg-card border rounded-3xl p-4 flex flex-col justify-between shadow-md relative min-h-[300px]">
                  <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain rounded-xl" />
                  <span className="absolute top-6 left-6 bg-red-500 text-foreground font-bold text-[9px] uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                    Sharing Screen
                  </span>
                </div>
              ) : null}

              {/* Screen Share panel(s) — a peer presenting. This is the "everyone
                  sees the host's screen" surface; without it a remote share had
                  nowhere to render bigger than a thumbnail. */}
              {(Object.entries(remoteScreenStreams) as [string, MediaStream][]).map(([socketId, stream]) => {
                const presenter = participants.find((p) => p.socketId === socketId);
                return (
                  <div key={`screen-${socketId}`} className="lg:col-span-2 bg-card border rounded-3xl p-4 flex flex-col justify-between shadow-md relative min-h-[300px]">
                    <RemoteVideo stream={stream} className="w-full h-full object-contain rounded-xl" />
                    <span className="absolute top-6 left-6 bg-emerald-500 text-foreground font-bold text-[9px] uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                      {presenter?.name || 'Someone'} is presenting
                    </span>
                  </div>
                );
              })}

              {/* Local calling stream panel */}
              <div className="bg-card dark:bg-card border rounded-3xl p-3.5 flex flex-col justify-between shadow-sm relative min-h-[220px]">
                <div className="flex-1 rounded-2xl overflow-hidden bg-card bg-card flex items-center justify-center relative aspect-video">
                  {videoOn && !mediaAccessFailed ? (
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  ) : (
                    <div className="w-full h-full bg-card dark:bg-card flex flex-col items-center justify-center relative select-none">
                      <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground font-black text-lg flex items-center justify-center shadow-md animate-pulse">
                        {user?.firstName?.substring(0, 2).toUpperCase() || 'ME'}
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-2 font-bold uppercase tracking-wider block">
                        {mediaAccessFailed ? 'Camera blocked (HTTP/Permission)' : 'Camera is off'}
                      </span>
                    </div>
                  )}

                  {/* Hand raise badge */}
                  {handRaised && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-foreground p-1 rounded-full shadow-md animate-bounce z-10 text-xs">
                      ✋
                    </div>
                  )}

                  {/* Micro label */}
                  <span className="absolute bottom-2 left-2 bg-black/60 text-foreground font-bold text-[9px] px-2 py-0.5 rounded-md backdrop-blur-xs select-none">
                    {user?.firstName} (You)
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px]">
                  <span className="font-extrabold text-muted-foreground uppercase tracking-wider">Local Stream</span>
                  <div className="flex items-center space-x-1.5">
                    {audioOn ? <Mic className="h-3.5 w-3.5 text-primary" /> : <MicOff className="h-3.5 w-3.5 text-red-500" />}
                    {videoOn ? <Video className="h-3.5 w-3.5 text-primary" /> : <VideoOff className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                </div>
              </div>

              {/* Participant streams grid list */}
              {participants.map((part) => (
                <div
                  key={part.socketId}
                  className={`bg-card dark:bg-card border rounded-3xl p-3.5 flex flex-col justify-between shadow-sm relative min-h-[220px] transition-all ${
                    effectivePinnedSocketId === part.socketId ? 'ring-2 ring-primary md:col-span-2 lg:col-span-2 md:row-span-2' : ''
                  }`}
                >
                  <div className="flex-1 rounded-2xl overflow-hidden bg-card flex items-center justify-center relative aspect-video">
                    {part.videoOn ? (
                      <div className="w-full h-full bg-card dark:bg-card flex items-center justify-center relative">
                        {remoteStreams[part.socketId] ? (
                          <RemoteVideo stream={remoteStreams[part.socketId]} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            {/* Mock user placeholder graphic stream card */}
                            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-black text-sm flex items-center justify-center animate-pulse">
                              {part.avatar}
                            </div>
                            <span className="absolute bottom-2 right-2 text-[9px] text-muted-foreground font-medium">1080p WebRTC stream</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <VideoOff className="h-8 w-8 stroke-1" />
                        <span className="text-[10px] font-bold">Camera is off</span>
                      </div>
                    )}

                    {/* Hand raise badge */}
                    {part.isHandRaised && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-foreground p-1 rounded-full shadow-md animate-bounce z-10 text-xs">
                        ✋
                      </div>
                    )}

                    {/* Connection quality dot — green/amber/red from live WebRTC stats */}
                    <span
                      title={`Connection: ${connectionQuality[part.socketId] || 'good'}`}
                      className={`absolute top-2 left-2 w-2 h-2 rounded-full ${
                        connectionQuality[part.socketId] === 'poor' ? 'bg-red-500' :
                        connectionQuality[part.socketId] === 'fair' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />

                    {/* Per-tile controls — visible on hover. Pin is available to
                        anyone (local-only); mute/remove/ban/spotlight are
                        host or co-host only. */}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all group flex items-center justify-center opacity-0 hover:opacity-100">
                      <div className="flex items-center space-x-1.5 flex-wrap justify-center">
                        <button
                          onClick={() => handleTogglePin(part.socketId)}
                          title={localPinnedSocketId === part.socketId ? 'Unpin' : 'Pin for me'}
                          className="p-2 bg-card/90 hover:bg-card text-foreground rounded-lg shadow-md transition-all"
                        >
                          {localPinnedSocketId === part.socketId ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </button>
                        {canModerate && (
                          <>
                            <button
                              onClick={() => handleSpotlightParticipant(part.socketId, part.name, spotlightedSocketId !== part.socketId)}
                              title={spotlightedSocketId === part.socketId ? 'Remove spotlight' : 'Spotlight for everyone'}
                              className="p-2 bg-card/90 hover:bg-card text-foreground rounded-lg shadow-md transition-all"
                            >
                              <Users className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleForceMuteParticipant(part.socketId, part.name)}
                              title="Mute participant"
                              className="p-2 bg-card/90 hover:bg-card text-foreground rounded-lg shadow-md transition-all"
                            >
                              <MicOff className="h-3.5 w-3.5" />
                            </button>
                            {isHost && (
                              <button
                                onClick={() => handleToggleCoHost(part.userId, part.name, !coHostIds.includes(part.userId))}
                                title={coHostIds.includes(part.userId) ? 'Remove co-host' : 'Make co-host'}
                                disabled={updatingCoHostId === part.userId}
                                className="p-2 bg-card/90 hover:bg-card text-foreground rounded-lg shadow-md transition-all disabled:opacity-50"
                              >
                                <Crown className={`h-3.5 w-3.5 ${coHostIds.includes(part.userId) ? 'text-amber-500' : ''}`} />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveParticipant(part.socketId, part.name)}
                              title="Remove from meeting"
                              className="p-2 bg-red-600 hover:bg-red-700 text-foreground rounded-lg shadow-md transition-all"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveParticipant(part.socketId, part.name, true)}
                              title="Remove and block from rejoining"
                              className="p-2 bg-red-600 hover:bg-red-700 text-foreground rounded-lg shadow-md transition-all"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <span className="absolute bottom-2 left-2 bg-black/60 text-foreground font-bold text-[9px] px-2 py-0.5 rounded-md backdrop-blur-xs select-none">
                      {part.name}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[10px]">
                    <span className="font-extrabold text-muted-foreground uppercase tracking-wider">
                      {part.userId === hostUserId ? 'Host' : coHostIds.includes(part.userId) ? 'Co-host' : 'Participant'}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {part.isMuted ? <MicOff className="h-3.5 w-3.5 text-red-500" /> : <Mic className="h-3.5 w-3.5 text-emerald-500" />}
                      {part.videoOn ? <Video className="h-3.5 w-3.5 text-emerald-500" /> : <VideoOff className="h-3.5 w-3.5 text-red-500" />}
                    </div>
                  </div>
                </div>
              ))}

            </div>

            {/* Bottom action drawer bar */}
            <div className="bg-card border border-card/10 px-3 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-xl flex items-center gap-2 sm:gap-0 sm:justify-between z-10 select-none overflow-x-auto">
              
              {/* Media Controls */}
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-xl transition-all ${audioOn ? 'bg-card text-foreground hover:bg-card' : 'bg-red-500 text-foreground hover:bg-red-600'}`}
                  title={audioOn ? 'Mute Mic' : 'Unmute Mic'}
                >
                  {audioOn ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-xl transition-all ${videoOn ? 'bg-card text-foreground hover:bg-card' : 'bg-red-500 text-foreground hover:bg-red-600'}`}
                  title={videoOn ? 'Disable Camera' : 'Enable Camera'}
                >
                  {videoOn ? <Video className="h-4.5 w-4.5" /> : <VideoOff className="h-4.5 w-4.5" />}
                </button>
                <button
                  onClick={handleRequestScreenShare}
                  disabled={awaitingScreenSharePermission}
                  className={`p-3 rounded-xl transition-all disabled:opacity-60 ${screenSharing ? 'bg-emerald-500 text-foreground hover:bg-emerald-600' : 'bg-card text-foreground hover:bg-card'}`}
                  title={screenSharing ? 'Stop Screen Share' : isHost ? 'Share Screen' : 'Ask host to share screen'}
                >
                  {awaitingScreenSharePermission ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Monitor className="h-4.5 w-4.5" />}
                </button>
                <button
                  onClick={toggleHandRaised}
                  className={`p-3 rounded-xl transition-all ${handRaised ? 'bg-amber-500 text-foreground' : 'bg-card text-foreground hover:bg-card'}`}
                  title="Raise / Lower Hand"
                >
                  ✋
                </button>
              </div>

              {/* Advanced Call Features */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowWhiteboard(!showWhiteboard)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${showWhiteboard ? 'bg-primary text-primary-foreground' : 'bg-foreground hover:bg-foreground/90 text-background'}`}
                >
                  Whiteboard
                </button>
                
                {isHost && (
                  <button
                    onClick={toggleRecording}
                    className={`p-3 rounded-xl transition-all flex items-center justify-center ${recording ? 'bg-red-500 text-foreground animate-pulse' : 'bg-card text-foreground hover:bg-card'}`}
                    title={recording ? 'Stop Recording' : 'Record Call'}
                  >
                    <Circle className={`h-4 w-4 ${recording ? 'fill-white' : 'fill-red-500 text-red-500'}`} />
                  </button>
                )}

                {/* Emojis reaction bar */}
                <div className="flex items-center bg-card rounded-xl px-2 py-1 space-x-1 border border-card/5">
                  {['👍', '❤️', '👏', '😂', '🎉'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      className="hover:scale-125 transition-transform p-1 text-sm duration-150"
                      title={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* End / Hang up */}
              <button
                onClick={() => {
                  if (canModerate) {
                    setShowEndMeetingModal(true);
                  } else {
                    handleDisconnect(false);
                  }
                }}
                className="px-5 py-3 bg-red-600 hover:bg-red-700 text-foreground font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/10 flex items-center space-x-1.5"
              >
                <PhoneOff className="h-4 w-4" />
                <span>Disconnect</span>
              </button>

            </div>

          </div>

          {/* Right sidebar messaging pane — full-width overlay on mobile/tablet,
              docked panel from md breakpoint up (same pattern as the Chat page) */}
          {showSidebar && (
            <aside className="fixed md:relative inset-y-0 right-0 w-full sm:w-96 md:w-80 border rounded-none md:rounded-3xl bg-card dark:bg-card flex flex-col shrink-0 overflow-hidden shadow-2xl md:shadow-sm z-40 md:z-10 animate-in slide-in-from-right duration-200">
              {/* Close button, mobile/tablet only — the docked desktop panel uses the toolbar toggle instead */}
              <button
                onClick={() => setShowSidebar(false)}
                className="md:hidden absolute right-3 top-3 z-10 p-1.5 rounded-lg bg-muted dark:bg-card text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Tab Selector */}
              <div className="flex border-b text-xs font-bold select-none">
                <button
                  onClick={() => setActiveSidebarTab('chat')}
                  className={`flex-1 py-3 text-center transition-all ${
                    activeSidebarTab === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-muted-foreground'
                  }`}
                >
                  Chat ({chatMessages.length})
                </button>
                <button
                  onClick={() => setActiveSidebarTab('participants')}
                  className={`flex-1 py-3 text-center transition-all ${
                    activeSidebarTab === 'participants' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-muted-foreground'
                  }`}
                >
                  Participants ({participants.length + 1})
                </button>
              </div>

              {/* Tab Viewport */}
              <div className="flex-1 overflow-y-auto">
                {activeSidebarTab === 'chat' ? (
                  <div className="space-y-3.5">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="space-y-0.5 text-left">
                        <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-wide">
                          <span>{msg.sender}</span>
                          <span>{msg.time}</span>
                        </div>
                        <p className="text-[11px] text-foreground dark:text-foreground bg-muted dark:bg-card p-2.5 rounded-xl border leading-relaxed break-words">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Mute-all bar — host/co-host only, only worth showing once
                        there's actually someone else to mute. */}
                    {canModerate && participants.length > 0 && (
                      <button
                        onClick={handleMuteAllParticipants}
                        className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wide py-2 rounded-xl border border-dashed text-muted-foreground hover:text-primary hover:border-primary transition-all"
                      >
                        <MicOff className="h-3 w-3" /> Mute all
                      </button>
                    )}

                    {/* Local participant row */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted dark:bg-card border text-left font-sans">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center font-bold">
                          ME
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground dark:text-foreground">{user?.firstName}</p>
                          <span className="text-[9px] font-black text-primary uppercase tracking-wider block font-bold flex items-center gap-1">
                            {isHost ? 'Host' : isCoHost ? (<><Crown className="h-2.5 w-2.5" /> Co-host</>) : 'Participant'}
                          </span>
                        </div>
                      </div>
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    </div>

                    {/* Participant rows */}
                    {participants.map((part) => {
                      const partIsCoHost = coHostIds.includes(part.userId);
                      return (
                      <div key={part.socketId} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted dark:bg-card transition-all border text-left font-sans">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-secondary dark:bg-card text-muted-foreground dark:text-muted-foreground font-bold text-xs flex items-center justify-center">
                            {part.avatar}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground dark:text-foreground">{part.name}</p>
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              {part.userId === hostUserId ? 'Host' : partIsCoHost ? (<><Crown className="h-2.5 w-2.5 text-amber-500" /> Co-host</>) : 'Participant'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          {canModerate && (
                            <>
                              <button
                                onClick={() => handleForceMuteParticipant(part.socketId, part.name)}
                                title="Mute participant"
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary dark:hover:bg-card hover:text-foreground dark:hover:text-foreground transition-all"
                              >
                                <MicOff className="h-3.5 w-3.5" />
                              </button>
                              {isHost && (
                                <button
                                  onClick={() => handleToggleCoHost(part.userId, part.name, !partIsCoHost)}
                                  title={partIsCoHost ? 'Remove co-host' : 'Make co-host'}
                                  disabled={updatingCoHostId === part.userId}
                                  className={`p-1.5 rounded-lg transition-all disabled:opacity-50 ${partIsCoHost ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30' : 'text-muted-foreground hover:bg-secondary dark:hover:bg-card hover:text-foreground dark:hover:text-foreground'}`}
                                >
                                  <Crown className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveParticipant(part.socketId, part.name)}
                                title="Remove from meeting"
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-all"
                              >
                                <UserX className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveParticipant(part.socketId, part.name, true)}
                                title="Remove and block from rejoining"
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-all"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chat Input Container */}
              {activeSidebarTab === 'chat' && (
                <form onSubmit={handleSendChat} className="p-3 border-t bg-muted dark:bg-card flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Type meeting note..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-card dark:bg-card border rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground dark:text-foreground"
                  />
                  <button type="submit" className="p-2 bg-primary text-primary-foreground rounded-xl shadow-md shrink-0">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}

            </aside>
          )}

        </div>
      )}

      {/* HOST SIDE POPUP NOTIFICATION (Asking to Accept or Cancel guest entry) */}
      <AnimatePresence>
        {isHost && meetingStep === 'room' && joinRequests.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            style={{ top: `${96 + i * 168}px` }}
            className="fixed right-6 z-50 bg-card dark:bg-card border border-border dark:border-border p-5 rounded-3xl shadow-2xl w-80 space-y-4 text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                {req.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                <h4 className="text-xs font-black text-foreground dark:text-foreground">{req.name}</h4>
                <p className="text-[10px] text-muted-foreground dark:text-muted-foreground mt-0.5">Wants to join this video meeting</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => handleAdmitRequest(req.id, true)}
                className="flex-1 py-2 bg-primary hover:bg-primary-dark text-primary-foreground font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-primary/10"
              >
                Accept
              </button>
              <button
                onClick={() => handleAdmitRequest(req.id, false)}
                className="flex-1 py-2 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card text-muted-foreground dark:text-foreground font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* HOST SIDE POPUP: guest asking to present their screen */}
      <AnimatePresence>
        {isHost && meetingStep === 'room' && screenSharePermissionRequests.map((req, i) => (
          <motion.div
            key={req.socketId}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            style={{ top: `${96 + (joinRequests.length + i) * 168}px` }}
            className="fixed right-6 z-50 bg-card dark:bg-card border border-border dark:border-border p-5 rounded-3xl shadow-2xl w-80 space-y-4 text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                <Monitor className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-foreground dark:text-foreground">{req.guestName}</h4>
                <p className="text-[10px] text-muted-foreground dark:text-muted-foreground mt-0.5">Wants to share their screen</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => handleScreenSharePermissionDecision(req, true)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-foreground font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-emerald-500/10"
              >
                Allow
              </button>
              <button
                onClick={() => handleScreenSharePermissionDecision(req, false)}
                className="flex-1 py-2 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card text-muted-foreground dark:text-foreground font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
              >
                Deny
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* HOST END MEETING CONFIRMATION MODAL */}
      <AnimatePresence>
        {showEndMeetingModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card dark:bg-card border border-border dark:border-border p-6 rounded-3xl w-full max-w-sm space-y-6 shadow-2xl relative text-center"
            >
              <button 
                onClick={() => setShowEndMeetingModal(false)} 
                className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mx-auto p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full inline-block">
                <PhoneOff className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground dark:text-foreground">End meeting?</h3>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed">
                  You are the host. Would you like to end the call for everyone or just leave the call?
                </p>
              </div>

              <div className="flex flex-col space-y-2.5 pt-2">
                <button
                  onClick={() => {
                    setShowEndMeetingModal(false);
                    handleDisconnect(true);
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-foreground font-semibold text-xs rounded-xl shadow-md shadow-red-600/20 transition-all"
                >
                  End call for everyone
                </button>

                <button
                  onClick={() => {
                    setShowEndMeetingModal(false);
                    handleDisconnect(false);
                  }}
                  className="w-full py-2.5 border border-border dark:border-border hover:bg-muted dark:hover:bg-card text-foreground dark:text-foreground font-semibold text-xs rounded-xl transition-all"
                >
                  Just leave
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE POLL MODAL — host/co-host only */}
      <AnimatePresence>
        {showCreatePollModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card dark:bg-card border border-border dark:border-border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setShowCreatePollModal(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1.5 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-bold text-foreground dark:text-foreground flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-primary" /> Create a poll
              </h3>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full bg-muted dark:bg-card border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => setPollOptions(prev => prev.map((o, idx) => idx === i ? e.target.value : o))}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 bg-muted dark:bg-card border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 8 && (
                  <button
                    onClick={() => setPollOptions(prev => [...prev, ''])}
                    className="text-[10px] font-bold text-primary flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add option
                  </button>
                )}
              </div>
              <button
                onClick={handleCreatePoll}
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold text-xs rounded-xl transition-all"
              >
                Launch poll
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACTIVE POLL CARD — visible to everyone in the room while a poll is live */}
      <AnimatePresence>
        {meetingStep === 'room' && activePoll && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-6 z-50 bg-card dark:bg-card border border-border dark:border-border p-4 rounded-2xl shadow-2xl w-80 space-y-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-primary uppercase tracking-wider flex items-center gap-1">
                <BarChart3 className="h-3 w-3" /> Poll · {activePoll.byName}
              </span>
              {canModerate && (
                <button onClick={handleEndPoll} className="text-[9px] font-bold text-muted-foreground hover:text-red-600">
                  End poll
                </button>
              )}
            </div>
            <p className="text-xs font-bold text-foreground dark:text-foreground">{activePoll.question}</p>
            <div className="space-y-1.5">
              {activePoll.options.map((opt, i) => {
                const count = pollResults?.counts[i] || 0;
                const total = pollResults?.totalVotes || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const isMine = myPollVote === i;
                return (
                  <button
                    key={i}
                    onClick={() => handleVotePoll(i)}
                    className={`w-full text-left rounded-xl border px-2.5 py-2 relative overflow-hidden transition-all ${isMine ? 'border-primary' : 'border-border dark:border-border hover:border-primary/50'}`}
                  >
                    <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all" style={{ width: `${pct}%` }} />
                    <div className="relative flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${isMine ? 'text-primary' : 'text-foreground dark:text-foreground'}`}>
                        {isMine && <Check className="inline h-3 w-3 mr-1" />}{opt}
                      </span>
                      <span className="font-bold text-muted-foreground">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground text-right">{pollResults?.totalVotes || 0} vote{(pollResults?.totalVotes || 0) === 1 ? '' : 's'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KEYBOARD SHORTCUTS MODAL */}
      <AnimatePresence>
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={() => setShowKeyboardShortcuts(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card dark:bg-card border border-border dark:border-border p-6 rounded-3xl w-full max-w-xs space-y-4 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1.5 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-bold text-foreground dark:text-foreground flex items-center gap-1.5">
                <Keyboard className="h-4 w-4 text-primary" /> Keyboard shortcuts
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Toggle microphone</span>
                  <kbd className="px-2 py-0.5 bg-muted dark:bg-card rounded-md font-mono text-[10px]">Ctrl/⌘ + D</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Toggle camera</span>
                  <kbd className="px-2 py-0.5 bg-muted dark:bg-card rounded-md font-mono text-[10px]">Ctrl/⌘ + E</kbd>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
