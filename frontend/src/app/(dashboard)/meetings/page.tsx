'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Copy, 
  Users, 
  MessageSquare, 
  Eraser, 
  Download, 
  PhoneOff, 
  Plus, 
  X, 
  Send, 
  Maximize2, 
  Check, 
  Circle,
  HelpCircle,
  Calendar,
  Grid,
  Loader2,
  Lock,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MeetingsPage() {
  const { user } = useAuthStore();
  
  // Navigation / State Gates
  const [meetingStep, setMeetingStep] = useState<'lobby' | 'waiting' | 'room'>('lobby'); // lobby, waiting, room
  const [meetingId, setMeetingId] = useState('');
  const [tempId, setTempId] = useState('');
  
  // Media States
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  
  // WebRTC Media Streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
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
  
  const [participants, setParticipants] = useState<any[]>([
    { id: '1', name: 'Sarah Connor', role: 'MANAGER', isMuted: false, videoOn: true, avatar: 'SC' },
    { id: '2', name: 'James Smith', role: 'EMPLOYEE', isMuted: true, videoOn: false, avatar: 'JS' },
    { id: '3', name: 'Elena Rostova', role: 'EMPLOYEE', isMuted: false, videoOn: true, avatar: 'ER' }
  ]);

  // Breakout Rooms State
  const [breakoutRooms, setBreakoutRooms] = useState<any[]>([
    { id: 'main', name: 'Main Room', count: 4 },
    { id: 'br-1', name: 'Breakout Room 1', count: 0 },
    { id: 'br-2', name: 'Breakout Room 2', count: 0 }
  ]);
  const [activeRoomId, setActiveRoomId] = useState('main');
  const [showBreakoutMenu, setShowBreakoutMenu] = useState(false);

  // Meeting Recording
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Lobby initializers
  useEffect(() => {
    // Generate a random meeting code on page load
    const randCode = Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
    setTempId(randCode);
  }, []);

  // WebRTC User Media initializer
  const initUserMedia = async () => {
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: videoOn ? { width: 640, height: 480 } : false,
        audio: audioOn
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Media capture failed, starting simulated workspace call:', err);
    }
  };

  useEffect(() => {
    if (meetingStep === 'lobby' || meetingStep === 'room') {
      initUserMedia();
    }
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [meetingStep, videoOn, audioOn]);

  // Video & Audio togglers
  const toggleVideo = () => {
    const nextState = !videoOn;
    setVideoOn(nextState);
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach(track => track.enabled = nextState);
    }
    toast.success(nextState ? 'Camera enabled' : 'Camera disabled');
  };

  const toggleAudio = () => {
    const nextState = !audioOn;
    setAudioOn(nextState);
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => track.enabled = nextState);
    }
    toast.success(nextState ? 'Microphone unmuted' : 'Microphone muted');
  };

  // Screen Sharing WebRTC capture
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
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
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
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  // Meeting recording WebRTC handler
  const toggleRecording = () => {
    if (recording) {
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      setRecording(false);
      toast.success('Meeting recording finalized and downloading!');
    } else {
      const stream = screenStream || mediaStream;
      if (!stream) {
        toast.error('No video streams active to record.');
        return;
      }
      
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-record-${meetingId}.webm`;
        a.click();
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      toast.success('Meeting recording started...');
    }
  };

  // Chat message send handler
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    setChatMessages(prev => [
      ...prev,
      { sender: user?.firstName || 'Me', content: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setChatInput('');
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/meetings?joinCode=${meetingId}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Meeting link copied to clipboard!');
  };

  // Breakout Rooms action
  const handleJoinBreakout = (roomId: string) => {
    setActiveRoomId(roomId);
    toast.success(`Joined ${breakoutRooms.find(r => r.id === roomId)?.name}`);
  };

  // Lobby actions
  const handleCreateMeeting = () => {
    if (!tempId) return;
    setMeetingId(tempId);
    setMeetingStep('waiting'); // send to waiting room
    
    // Simulate admission after 3 seconds
    setTimeout(() => {
      setMeetingStep('room');
      toast.success('Welcome! You have entered the workspace calling room.');
    }, 3000);
  };

  const handleJoinExisting = () => {
    if (!meetingId.trim()) {
      toast.error('Please enter a valid meeting code.');
      return;
    }
    setMeetingStep('waiting');
    
    setTimeout(() => {
      setMeetingStep('room');
      toast.success('Welcome! Admin has admitted you to the meeting.');
    }, 2500);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 overflow-hidden h-[calc(100vh-4rem)]">
      
      {/* LOBBY / SETUP SCREEN */}
      {meetingStep === 'lobby' && (
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 max-w-5xl mx-auto w-full">
          {/* Setup controls & preview */}
          <div className="w-full md:w-1/2 space-y-6">
            <div className="space-y-2 text-left">
              <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider rounded-md">Calling Hub</span>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-105">Interactive Workspace Meetings</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect with your teams instantly with video calling, whiteboard drawing, breakout rooms, and session recording tools.
              </p>
            </div>

            {/* Video preview sandbox */}
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border shadow-md flex items-center justify-center">
              {videoOn ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <VideoOff className="h-10 w-10 stroke-1" />
                  <span className="text-[10px] font-bold">Camera is disabled</span>
                </div>
              )}

              {/* Hardware toggles overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 z-10">
                <button
                  onClick={toggleAudio}
                  className={`p-2.5 rounded-xl transition-all ${audioOn ? 'bg-primary text-white' : 'bg-red-500 text-white'}`}
                >
                  {audioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`p-2.5 rounded-xl transition-all ${videoOn ? 'bg-primary text-white' : 'bg-red-500 text-white'}`}
                >
                  {videoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Lobby form panels */}
          <div className="w-full md:w-1/2 bg-white dark:bg-slate-900 border p-8 rounded-3xl shadow-xl space-y-6 text-left relative overflow-hidden">
            <div className="absolute -top-24 -right-24 h-48 w-48 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Start a New Workspace Session</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={tempId}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 select-all focus:outline-none"
                />
                <button
                  onClick={handleCreateMeeting}
                  className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary/95 transition-all flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Start Call</span>
                </button>
              </div>
            </div>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t" />
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-black uppercase tracking-wider">or join call</span>
              <div className="flex-grow border-t" />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Join Existing Meeting</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter meeting code (e.g. abcd-efgh)"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                <button
                  onClick={handleJoinExisting}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5"
                >
                  <Monitor className="h-4 w-4" />
                  <span>Request to Join Room</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WAITING ROOM SCREEN */}
      {meetingStep === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto space-y-6 text-center animate-fade-in">
          <div className="relative">
            <div className="p-5 bg-primary/10 text-primary rounded-full animate-bounce">
              <Lock className="h-10 w-10" />
            </div>
            <div className="absolute inset-0 p-5 border border-primary/20 rounded-full animate-ping pointer-events-none" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-105">Lobby Waiting Room</h2>
            <p className="text-xs text-muted-foreground max-w-xs">
              Waiting for workspace admins to admit you. Please verify your hardware preview settings while you wait.
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border rounded-2xl w-full flex items-center justify-between text-left shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Meeting Room Code</span>
              <p className="text-xs font-bold text-slate-850 dark:text-slate-200">{meetingId}</p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-slate-450" />
          </div>

          {/* Override button for local dev to quickly test join */}
          <button
            onClick={() => setMeetingStep('room')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            Bypass Lobby Waiting
          </button>
        </div>
      )}

      {/* MEETING ROOM WORKSPACE */}
      {meetingStep === 'room' && (
        <div className="flex-1 flex gap-4 overflow-hidden relative">
          
          {/* Main call canvas viewport */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            
            {/* Header info */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border px-6 py-3 rounded-2xl shadow-xs">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <div className="text-left">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Live Session ({activeRoomId === 'main' ? 'Main Room' : breakoutRooms.find(r => r.id === activeRoomId)?.name})
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{meetingId}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-[10px] font-bold transition-all text-slate-700 dark:text-slate-350 flex items-center space-x-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>Invite Link</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowBreakoutMenu(!showBreakoutMenu)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1 ${
                      showBreakoutMenu ? 'bg-primary text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Compass className="h-3 w-3" />
                    <span>Breakout Rooms</span>
                  </button>

                  {/* Breakout rooms select menu */}
                  {showBreakoutMenu && (
                    <div className="absolute right-0 top-9 bg-white dark:bg-slate-900 border rounded-2xl shadow-xl p-3 w-48 z-40 space-y-2 text-left animate-fade-in">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b pb-1">Spawn Rooms</span>
                      {breakoutRooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => {
                            handleJoinBreakout(room.id);
                            setShowBreakoutMenu(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold block transition-all ${
                            activeRoomId === room.id 
                              ? 'bg-primary/10 text-primary font-bold' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {room.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Video participants panel & Screen Share / Whiteboard block */}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
              
              {/* Whiteboard module */}
              {showWhiteboard ? (
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border rounded-3xl p-4 flex flex-col gap-3 min-h-[300px]">
                  <div className="flex items-center justify-between border-b pb-2 select-none">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Collaboration Whiteboard</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setActiveTool('pen')}
                        className={`p-1.5 rounded-lg ${activeTool === 'pen' ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
                        title="Pen Tool"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setActiveTool('eraser')}
                        className={`p-1.5 rounded-lg ${activeTool === 'eraser' ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
                        title="Eraser Tool"
                      >
                        <Eraser className="h-4 w-4" />
                      </button>
                      <button onClick={clearCanvas} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Clear Canvas">
                        <X className="h-4 w-4" />
                      </button>
                      <button onClick={downloadCanvas} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Save Drawing">
                        <Download className="h-4 w-4" />
                      </button>
                      <button onClick={() => setShowWhiteboard(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Close Whiteboard">
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
                    className="flex-1 w-full border bg-slate-50 rounded-2xl cursor-crosshair touch-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              ) : null}

              {/* Screen Share panel */}
              {screenSharing ? (
                <div className="lg:col-span-2 bg-slate-900 border rounded-3xl p-4 flex flex-col justify-between shadow-md relative min-h-[300px]">
                  <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain rounded-xl" />
                  <span className="absolute top-6 left-6 bg-red-500 text-white font-bold text-[9px] uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                    Sharing Screen
                  </span>
                </div>
              ) : null}

              {/* Local calling stream panel */}
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-3.5 flex flex-col justify-between shadow-sm relative min-h-[220px]">
                <div className="flex-1 rounded-2xl overflow-hidden bg-slate-955 flex items-center justify-center relative aspect-video">
                  {videoOn ? (
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600">
                      <VideoOff className="h-8 w-8 stroke-1" />
                      <span className="text-[10px] font-bold">Your camera is off</span>
                    </div>
                  )}

                  {/* Micro label */}
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white font-bold text-[9px] px-2 py-0.5 rounded-md backdrop-blur-xs select-none">
                    {user?.firstName} (You)
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px]">
                  <span className="font-extrabold text-slate-500 uppercase tracking-wider">Local Stream</span>
                  <div className="flex items-center space-x-1.5">
                    {audioOn ? <Mic className="h-3.5 w-3.5 text-primary" /> : <MicOff className="h-3.5 w-3.5 text-red-500" />}
                    {videoOn ? <Video className="h-3.5 w-3.5 text-primary" /> : <VideoOff className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                </div>
              </div>

              {/* Participant streams grid list */}
              {participants.map((part) => (
                <div key={part.id} className="bg-white dark:bg-slate-900 border rounded-3xl p-3.5 flex flex-col justify-between shadow-sm relative min-h-[220px]">
                  <div className="flex-1 rounded-2xl overflow-hidden bg-slate-955 flex items-center justify-center relative aspect-video">
                    {part.videoOn ? (
                      <div className="w-full h-full bg-slate-800 dark:bg-slate-950 flex items-center justify-center relative">
                        {/* Mock user placeholder graphic stream card */}
                        <div className="w-12 h-12 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center animate-pulse">
                          {part.avatar}
                        </div>
                        <span className="absolute bottom-2 right-2 text-[9px] text-slate-400 font-medium">1080p WebRTC stream</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600">
                        <VideoOff className="h-8 w-8 stroke-1" />
                        <span className="text-[10px] font-bold">Camera is off</span>
                      </div>
                    )}

                    <span className="absolute bottom-2 left-2 bg-black/60 text-white font-bold text-[9px] px-2 py-0.5 rounded-md backdrop-blur-xs select-none">
                      {part.name}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[10px]">
                    <span className="font-extrabold text-slate-500 uppercase tracking-wider">{part.role}</span>
                    <div className="flex items-center space-x-1.5">
                      {part.isMuted ? <MicOff className="h-3.5 w-3.5 text-red-500" /> : <Mic className="h-3.5 w-3.5 text-emerald-500" />}
                      {part.videoOn ? <Video className="h-3.5 w-3.5 text-emerald-500" /> : <VideoOff className="h-3.5 w-3.5 text-red-500" />}
                    </div>
                  </div>
                </div>
              ))}

            </div>

            {/* Bottom action drawer bar */}
            <div className="bg-slate-900 border border-white/10 px-6 py-4 rounded-2xl shadow-xl flex items-center justify-between z-10 select-none">
              
              {/* Media Controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-xl transition-all ${audioOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500 text-white hover:bg-red-650'}`}
                  title={audioOn ? 'Mute Mic' : 'Unmute Mic'}
                >
                  {audioOn ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-xl transition-all ${videoOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500 text-white hover:bg-red-650'}`}
                  title={videoOn ? 'Disable Camera' : 'Enable Camera'}
                >
                  {videoOn ? <Video className="h-4.5 w-4.5" /> : <VideoOff className="h-4.5 w-4.5" />}
                </button>
                <button
                  onClick={toggleScreenSharing}
                  className={`p-3 rounded-xl transition-all ${screenSharing ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                  title={screenSharing ? 'Stop Screen Share' : 'Share Screen'}
                >
                  <Monitor className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Advanced Call Features */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowWhiteboard(!showWhiteboard)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${showWhiteboard ? 'bg-primary text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                >
                  Whiteboard
                </button>
                
                <button
                  onClick={toggleRecording}
                  className={`p-3 rounded-xl transition-all flex items-center justify-center ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                  title={recording ? 'Stop Recording' : 'Record Call'}
                >
                  <Circle className={`h-4 w-4 ${recording ? 'fill-white' : 'fill-red-500 text-red-500'}`} />
                </button>
              </div>

              {/* End / Hang up */}
              <button
                onClick={() => {
                  setMeetingStep('lobby');
                  if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                  }
                  toast.success('You have left the meeting workspace.');
                }}
                className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/10 flex items-center space-x-1.5"
              >
                <PhoneOff className="h-4 w-4" />
                <span>Disconnect</span>
              </button>

            </div>

          </div>

          {/* Right sidebar messaging pane */}
          {showSidebar && (
            <aside className="w-80 border rounded-3xl bg-white dark:bg-slate-900 flex flex-col shrink-0 overflow-hidden shadow-sm">
              {/* Tab Selector */}
              <div className="flex border-b text-xs font-bold select-none">
                <button
                  onClick={() => setActiveSidebarTab('chat')}
                  className={`flex-1 py-3 text-center transition-all ${
                    activeSidebarTab === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-650'
                  }`}
                >
                  Chat ({chatMessages.length})
                </button>
                <button
                  onClick={() => setActiveSidebarTab('participants')}
                  className={`flex-1 py-3 text-center transition-all ${
                    activeSidebarTab === 'participants' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-650'
                  }`}
                >
                  Participants ({participants.length + 1})
                </button>
              </div>

              {/* Tab Viewport */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeSidebarTab === 'chat' ? (
                  <div className="space-y-3.5">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="space-y-0.5 text-left">
                        <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-wide">
                          <span>{msg.sender}</span>
                          <span>{msg.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border leading-relaxed break-words">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Local participant row */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border text-left">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary text-white font-black text-xs flex items-center justify-center">
                          ME
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user?.firstName}</p>
                          <span className="text-[9px] font-black text-primary uppercase tracking-wider block">Host</span>
                        </div>
                      </div>
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    </div>

                    {/* Participant rows */}
                    {participants.map((part) => (
                      <div key={part.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:bg-slate-950 transition-all border text-left">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-xs flex items-center justify-center">
                            {part.avatar}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{part.name}</p>
                            <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">{part.role}</span>
                          </div>
                        </div>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Input Container */}
              {activeSidebarTab === 'chat' && (
                <form onSubmit={handleSendChat} className="p-3 border-t bg-slate-50 dark:bg-slate-950 flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Type meeting note..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-850 dark:text-slate-100"
                  />
                  <button type="submit" className="p-2 bg-primary text-white rounded-xl shadow-md shrink-0">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}

            </aside>
          )}

        </div>
      )}

    </div>
  );
}
