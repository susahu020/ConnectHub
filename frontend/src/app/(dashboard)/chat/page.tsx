'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Users, 
  FileText, 
  FileImage,
  Calendar,
  Clock,
  ExternalLink,
  Plus,
  Paperclip,
  Send,
  Edit3,
  Trash2,
  Check,
  CheckCheck,
  X,
  Info,
  Pin,
  Bookmark,
  CornerUpLeft,
  CornerUpRight,
  Mic,
  MicOff,
  Search,
  BarChart3,
  ChevronDown,
  ArrowLeft,
  Copy,
  Camera,
  User,
  Smile,
  Headphones,
  Phone,
  Upload,
  Edit,
  Heart,
  Shield,
  VolumeX,
  Trash,
  AlertOctagon,
  Bold,
  Italic,
  Code,
  History
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { useSocket } from '../../../components/providers';
import { toast } from 'react-hot-toast';
import { resolveFileUrl } from '../../../lib/utils';
import { useConfirm } from '../../../context/ConfirmContext';

const PRESET_GIFS = [
  { name: 'Success / Yes', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2Q5ZDFmMGNkNThkYTgyM2M0NmIyNmRlNjExOTZkZGRlMzJmNjA5NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ohhweiDgDm5SS5ryU/giphy.gif' },
  { name: 'Celebrating', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmMyOWFiOWE4MGNiZmY5YWE0NmIzMGM4NWNmZTEzNTEyN2I1MGQ0NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26n6R5HO1II3OQt3O/giphy.gif' },
  { name: 'Let\'s Go', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWY1NjA5ZmI5YWE0OTdiNGNkNTRmZjE0Y2RhNjQzODNlNmIxNDRjNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3q2IPt1fO5U225P2/giphy.gif' },
  { name: 'Working Hard', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGMwOWRmNzNlMWM2M2U4NTViNmY4Yjg3NjFlMGM5NzhhMzBhNWFkNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26fCPA5W7ZNYaUe4M/giphy.gif' },
  { name: 'Brainstorming', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWZiNjg4YWE2MmM0NGZhYTkwNjIyODk2NTAyMGQxMDk5NmNmNzZiNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0IylOPCNkiqAzvQQ/giphy.gif' },
  { name: 'Mind Blown', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmQ4YzRhN2IzNTRmNzA5NGI3MmYxM2IzYmNjMmRjMTRiMmRjMzA3MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0NwHXQy3kUSfN6UM/giphy.gif' },
  { name: 'Thank You', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWRhZTlhYjBiZDlkOWRjY2I5YTc1ZjExYmY3MWNiZTM1MzJiMDNkZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6ZtpxSgADWN4kJDa/giphy.gif' },
  { name: 'Coffee Time', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2Y0MGMzOTRkNmZhZDIyMmQ2MDhmYmNlYzJiNDk2MmI4MjEwMGU1ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TDfG3P7Q8lOqA/giphy.gif' }
];

const isGifUrl = (text: string) => {
  return typeof text === 'string' && (text.startsWith('http://') || text.startsWith('https://')) && text.endsWith('.gif');
};

const renderFormattedText = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const elements = parts.map((part, pIdx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={pIdx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] text-red-500">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} className="font-extrabold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={pIdx} className="italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });

    return (
      <span key={idx} className="block min-h-[1.25em]">
        {elements}
      </span>
    );
  });
};

export default function ChatPage() {
  const { user } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [activeContact, setActiveContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [typingStatus, setTypingStatus] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<any>(null);
  
  // File Attachment Upload
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Message Mode
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editValue, setEditValue] = useState('');

  // Info Sidebar Panel & Search Toggles
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');

  // WhatsApp Features State
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const contactAvatarRef = useRef<HTMLInputElement>(null);

  // Attachment Modals & Popovers States
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [contactPickerOpen, setContactPickerOpen] = useState(false);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  const [stickerPanelOpen, setStickerPanelOpen] = useState(false);

  // Sidebar Extra Configuration States
  const [isMuted, setIsMuted] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState('off');
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [privacyEnabled, setPrivacyEnabled] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [blockedContacts, setBlockedContacts] = useState<Set<string>>(new Set());
  const isBlocked = activeContact ? blockedContacts.has(activeContact.id) : false;

  // Advanced messaging states
  const [replyingMessage, setReplyingMessage] = useState<any>(null);
  const [forwardingMessage, setForwardingMessage] = useState<any>(null);
  const [forwardingTargetUser, setForwardingTargetUser] = useState<string>('');

  // Poll state variables
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Voice recording state variables
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // UI/UX improvements: context menu & loading states
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: any } | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Advanced Chat Features States
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeStickerTab, setActiveStickerTab] = useState<'stickers' | 'gifs'>('stickers');
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [showEditHistoryMessageId, setShowEditHistoryMessageId] = useState<string | null>(null);

  // Fetch Directory users
  const { data: directoryData, isLoading: loadingDirectory } = useQuery({
    queryKey: ['directory-colleagues'],
    queryFn: () => api.getDirectory('limit=100'),
  });

  // Fetch active contact full profile details (only when activeContact is selected and not a group)
  const { data: contactProfile, refetch: refetchContactProfile, isLoading: loadingContactProfile } = useQuery({
    queryKey: ['contact-profile', activeContact?.id],
    queryFn: () => api.getProfileById(activeContact?.id),
    enabled: !!activeContact && activeContact.type !== 'GROUP',
  });

  // Populate edit fields when profile loads
  useEffect(() => {
    if (contactProfile) {
      setEditFirstName(contactProfile.firstName || '');
      setEditLastName(contactProfile.lastName || '');
      setEditPhone(contactProfile.phone || '');
      setEditBio(contactProfile.bio || '');
    }
  }, [contactProfile]);

  // Mentions state
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  const filteredMentionUsers = (directoryData?.users || []).filter((u: any) => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return fullName.includes(mentionQuery.toLowerCase()) || u.email.toLowerCase().includes(mentionQuery.toLowerCase());
  }).slice(0, 8);

  const handleSelectMention = (member: any) => {
    const lastAtIndex = inputValue.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeMention = inputValue.slice(0, lastAtIndex);
      const mentionText = `@${member.firstName}${member.lastName} `;
      const newValue = beforeMention + mentionText;
      setInputValue(newValue);
    }
    setMentionOpen(false);
  };

  // Clear conversation dropdown menu
  const [clearMenuOpen, setClearMenuOpen] = useState(false);
  const clearMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutsideClear = (event: MouseEvent) => {
      if (clearMenuRef.current && !clearMenuRef.current.contains(event.target as Node)) {
        setClearMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideClear);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideClear);
    };
  }, []);

  // Time Formatter Safe Helper
  const formatMessageTime = (dateStr: any) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 1. Get Recent conversations
  const { data: recentChats, isLoading: loadingChats, refetch: refetchRecent } = useQuery({
    queryKey: ['recent-chats'],
    queryFn: () => api.getRecentChats(),
  });

  // Fetch bookmarks
  const { data: bookmarkedList, refetch: refetchBookmarks } = useQuery({
    queryKey: ['bookmarked-messages'],
    queryFn: () => api.getBookmarks(),
    enabled: !!user,
  });

  // Fetch direct messages when activeContact changes
  useEffect(() => {
    if (!activeContact) return;

    const fetchDMs = async () => {
      setLoadingMessages(true);
      try {
        const response = await api.getDirectMessages(activeContact.id);
        setMessages(response.messages || []);
        await api.markAsRead({ contactId: activeContact.id });
        refetchRecent();
      } catch (err) {
        toast.error('Failed to load messages.');
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchDMs();
    setReplyingMessage(null);
  }, [activeContact]);

  // Context Menu Click-away Dismissal
  useEffect(() => {
    const handleWindowClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Focus search input (Ctrl + K or Cmd + K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search colleagues..."]') as HTMLInputElement;
        searchInput?.focus();
      }

      // 2. Focus message search input (Ctrl + /)
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowMsgSearch(true);
        setTimeout(() => {
          const msgSearchInput = document.querySelector('input[placeholder="Search conversation..."]') as HTMLInputElement;
          msgSearchInput?.focus();
        }, 100);
      }

      // 3. Clear/Close on Esc
      if (e.key === 'Escape') {
        if (pollModalOpen) {
          setPollModalOpen(false);
        } else if (editingMessage) {
          setEditingMessage(null);
        } else if (replyingMessage) {
          setReplyingMessage(null);
        } else if (forwardingMessage) {
          setForwardingMessage(null);
        } else if (showMsgSearch) {
          setShowMsgSearch(false);
          setMsgSearchQuery('');
        } else if (activeContact) {
          setActiveContact(null);
        }
      }

      // 4. ArrowUp to edit last message
      if (e.key === 'ArrowUp' && activeContact && !inputValue && messages.length > 0) {
        // Find last message sent by self
        const selfMessages = messages.filter((m) => m.senderId === user?.id && !m.isDeleted);
        if (selfMessages.length > 0) {
          const lastMsg = selfMessages[selfMessages.length - 1];
          setEditingMessage(lastMsg);
          setEditValue(lastMsg.content);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeContact, user, messages, inputValue, pollModalOpen, editingMessage, replyingMessage, forwardingMessage, showMsgSearch]);

  // Read URL query parameters for auto-selecting a contact from Directory
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const contactId = params.get('contactId');
      if (contactId) {
        const name = params.get('name') || 'User';
        const avatarUrl = params.get('avatarUrl') || '';
        const status = params.get('status') || 'OFFLINE';
        setActiveContact({ id: contactId, name, avatarUrl, status });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingStatus]);

  // 3. Listen to Real-time Socket events
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (msg: any) => {
      if (!msg) return;
      if (activeContact && user) {
        const belongsToActive = 
          (msg.senderId === activeContact.id && msg.receiverId === user.id) ||
          (msg.senderId === user.id && msg.receiverId === activeContact.id);
          
        if (belongsToActive) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.senderId !== user.id) {
            api.markAsRead({ contactId: activeContact.id });
            socket.emit('read_receipt', { messageId: msg.id, senderId: activeContact.id });
          }
        }
      }
      refetchRecent();
    };

    const handleReadReceipt = ({ messageId, userId }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, statuses: [{ status: 'READ', userId }] } : m
        )
      );
    };

    const handleTyping = ({ senderId, groupId }: any) => {
      if (activeContact && senderId === activeContact.id && !groupId) {
        setTypingStatus(`${activeContact.name} is typing...`);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingStatus(null);
        }, 4000);
      }
    };

    const handleStopTyping = ({ senderId, groupId }: any) => {
      if (activeContact && senderId === activeContact.id && !groupId) {
        setTypingStatus(null);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    };

    const handlePresence = ({ userId, status, devices, lastSeen }: any) => {
      if (activeContact && activeContact.id === userId) {
        setActiveContact((prev: any) => ({ ...prev, status, devices, lastSeen }));
      }
      refetchRecent();
    };

    const handleMessageDeleted = ({ messageId }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: 'This message was deleted.', isDeleted: true, isDeletedForEveryone: true }
            : m
        )
      );
    };

    const handleMessagePinned = ({ messageId, isPinned }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned } : m))
      );
    };

    const handleMessageEdited = ({ messageId, content, isEdited }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content, isEdited } : m))
      );
      refetchRecent();
    };

    const handlePollUpdated = (poll: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.poll?.id === poll.id ? { ...m, poll } : m))
      );
    };

    socket.on('message', handleIncomingMessage);
    socket.on('message_read', handleReadReceipt);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('presence', handlePresence);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('message_edited', handleMessageEdited);
    socket.on('poll_updated', handlePollUpdated);

    return () => {
      socket.off('message', handleIncomingMessage);
      socket.off('message_read', handleReadReceipt);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('presence', handlePresence);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('message_edited', handleMessageEdited);
      socket.off('poll_updated', handlePollUpdated);
    };
  }, [socket, activeContact, user]);

  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (body: any) => api.sendMessage(body),
    onSuccess: (data) => {
      if (data.scheduledFor) {
        toast.success(`Message scheduled successfully for ${new Date(data.scheduledFor).toLocaleString()}`);
      } else {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
      setInputValue('');
      setAttachedFiles([]);
      setReplyingMessage(null);
      setScheduledDate('');
      setShowScheduler(false);
      refetchRecent();
    },
    onError: () => {
      toast.error('Could not send message.');
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    setMentionOpen(false);

    // Process Slash Commands
    if (inputValue.trim().startsWith('/')) {
      const commandText = inputValue.trim();
      const parts = commandText.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      if (cmd === '/help') {
        toast.success(
          "Available Slash Commands:\n" +
          "/help - Display help guide\n" +
          "/clear - Reset messages in current view\n" +
          "/mute - Block notification sound indicators\n" +
          "/unmute - Enable notification sound indicators\n" +
          "/giphy [query] - Send a preset GIF (e.g. success, coffee, coffee time, let's go)",
          { duration: 8000 }
        );
        setInputValue('');
        return;
      }
      
      if (cmd === '/clear') {
        setMessages([]);
        toast.success('Chat screen cleared locally.');
        setInputValue('');
        return;
      }

      if (cmd === '/mute') {
        setIsMuted(true);
        toast.success('Chat notifications muted.');
        setInputValue('');
        return;
      }

      if (cmd === '/unmute') {
        setIsMuted(false);
        toast.success('Chat notifications unmuted.');
        setInputValue('');
        return;
      }

      if (cmd === '/giphy') {
        const query = args.toLowerCase();
        const match = PRESET_GIFS.find(g => g.name.toLowerCase().includes(query)) || PRESET_GIFS[0];
        sendMessageMutation.mutate({
          receiverId: activeContact.id,
          content: match.url,
          fileIds: [],
          parentId: replyingMessage?.id || null,
        });
        return;
      }

      toast.error(`Unknown slash command: ${cmd}. Type /help to see available commands.`);
      return;
    }

    const payload: any = {
      receiverId: activeContact.id,
      content: inputValue,
      fileIds: attachedFiles.map((f) => f.id),
      parentId: replyingMessage?.id || null,
    };

    if (scheduledDate) {
      payload.scheduledFor = new Date(scheduledDate).toISOString();
    }

    sendMessageMutation.mutate(payload);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (!socket || !activeContact) return;

    // Mentions logic
    const lastAtIndex = val.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const queryPart = val.slice(lastAtIndex + 1);
      if (!queryPart.includes(' ')) {
        setMentionQuery(queryPart);
        setMentionOpen(true);
      } else {
        setMentionOpen(false);
      }
    } else {
      setMentionOpen(false);
    }

    socket.emit('typing', { contactId: activeContact.id, groupId: null });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { contactId: activeContact.id, groupId: null });
    }, 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.uploadFile(formData);
      setAttachedFiles((prev) => [...prev, response]);
      toast.success(`${file.name} attached.`);
    } catch (err: any) {
      toast.error(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Message Actions
  const handleEditMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editValue.trim() || !editingMessage) return;

    try {
      const updated = await api.editMessage(editingMessage.id, editValue);
      setMessages((prev) => prev.map((m) => (m.id === editingMessage.id ? updated : m)));
      setEditingMessage(null);
      setEditValue('');
      toast.success('Message updated.');
    } catch (err) {
      toast.error('Could not edit message.');
    }
  };

  const handleDeleteMessage = async (msgId: string, mode: 'FOR_ME' | 'FOR_EVERYONE') => {
    try {
      await api.deleteMessage(msgId, mode);
      if (mode === 'FOR_ME') {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: 'This message was deleted.', isDeleted: true, isDeletedForEveryone: true }
              : m
          )
        );
      }
      toast.success('Message deleted.');
    } catch (err) {
      toast.error('Could not delete message.');
    }
  };

  const handleClearChatHistory = async () => {
    if (!activeContact) return;
    if (!await confirm({
      title: 'Clear Chat History',
      message: 'Are you sure you want to clear chat history? This will delete all messages for you, but keep the chat open.',
      confirmText: 'Clear Chat',
      type: 'danger'
    })) return;
    try {
      const payload = activeContact.type === 'GROUP' 
        ? { groupId: activeContact.id } 
        : { contactId: activeContact.id };
      await api.clearChat(payload);
      setMessages([]);
      toast.success('Chat history cleared.');
      refetchRecent();
      setClearMenuOpen(false);
    } catch (err) {
      toast.error('Could not clear chat history.');
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeContact) return;
    if (!await confirm({
      title: 'Delete Conversation',
      message: 'Are you sure you want to delete this conversation? This will clear all messages and close the chat.',
      confirmText: 'Delete Conversation',
      type: 'danger'
    })) return;
    try {
      const payload = activeContact.type === 'GROUP' 
        ? { groupId: activeContact.id, isDelete: true } 
        : { contactId: activeContact.id, isDelete: true };
      await api.clearChat(payload);
      setMessages([]);
      toast.success('Conversation deleted.');
      refetchRecent();
      setActiveContact(null);
      setClearMenuOpen(false);
    } catch (err) {
      toast.error('Could not delete conversation.');
    }
  };

  const handleAddReaction = async (msgId: string, emoji: string) => {
    try {
      const reaction = await api.addReaction(msgId, emoji);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, reactions: [...(m.reactions || []), reaction] }
            : m
        )
      );
    } catch (err) {
      toast.error('Failed to add reaction.');
    }
  };

  // Pin / Bookmark / Forward triggers
  const handleTogglePin = async (msgId: string) => {
    try {
      const response = await api.pinMessage(msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isPinned: response.isPinned } : m))
      );
      toast.success(response.isPinned ? 'Message pinned.' : 'Message unpinned.');
    } catch (err) {
      toast.error('Failed to pin message.');
    }
  };

  const handleToggleBookmark = async (msgId: string) => {
    try {
      const response = await api.bookmarkMessage(msgId);
      refetchBookmarks();
      toast.success(response.bookmarked ? 'Starred bookmark saved.' : 'Bookmark removed.');
    } catch (err) {
      toast.error('Failed to toggle bookmark.');
    }
  };

  const handleCopyText = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard.');
  };

  const handleForwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwardingMessage || !forwardingTargetUser) return;

    try {
      await api.forwardMessage(forwardingMessage.id, {
        targetReceiverIds: [forwardingTargetUser],
      });
      setForwardingMessage(null);
      setForwardingTargetUser('');
      toast.success('Message forwarded successfully.');
    } catch (err) {
      toast.error('Failed to forward message.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await api.updateProfileById(activeContact.id, {
        firstName: editFirstName,
        lastName: editLastName,
        phone: editPhone,
        bio: editBio,
      });
      toast.success('Contact profile updated successfully!');
      setIsEditingContact(false);
      
      // Update name locally in state
      const newName = `${editFirstName} ${editLastName}`.trim();
      setActiveContact((prev: any) => ({
        ...prev,
        name: newName,
      }));
      
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['contact-profile', activeContact.id] });
      queryClient.invalidateQueries({ queryKey: ['recent-chats'] });
      queryClient.invalidateQueries({ queryKey: ['directory-colleagues'] });
    } catch (err) {
      toast.error('Failed to update contact profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleContactAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    const uploadToast = toast.loading('Uploading avatar image...');
    try {
      const res = await api.uploadAvatarById(activeContact.id, formData);
      toast.success('Profile picture updated!', { id: uploadToast });
      
      // Update locally in state
      setActiveContact((prev: any) => ({
        ...prev,
        avatarUrl: res.avatarUrl,
      }));
      
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['contact-profile', activeContact.id] });
      queryClient.invalidateQueries({ queryKey: ['recent-chats'] });
      queryClient.invalidateQueries({ queryKey: ['directory-colleagues'] });
    } catch (err) {
      toast.error('Failed to upload avatar.', { id: uploadToast });
    }
  };

  const handleToggleBlock = () => {
    const isBlocked = blockedContacts.has(activeContact.id);
    const copy = new Set(blockedContacts);
    if (isBlocked) {
      copy.delete(activeContact.id);
      toast.success(`${activeContact.name} unblocked successfully.`);
    } else {
      copy.add(activeContact.id);
      toast.success(`${activeContact.name} blocked successfully.`);
    }
    setBlockedContacts(copy);
  };

  // Camera capture handlers
  const startCamera = async () => {
    setCameraModalOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log(e));
        }
      }, 300);
    } catch (err) {
      toast.error('Unable to access camera.');
      setCameraModalOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraModalOpen(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.png`, { type: 'image/png' });
            stopCamera();
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            
            try {
              const res = await api.uploadFile(formData);
              sendMessageMutation.mutate({
                receiverId: activeContact.id,
                content: '📷 Photo Capture',
                fileIds: [res.id],
              });
              toast.success('Photo sent successfully.');
            } catch (err) {
              toast.error('Failed to upload photo.');
            } finally {
              setUploading(false);
            }
          }
        }, 'image/png');
      }
    }
  };

  // Contact Picker handler
  const handleShareContact = (colleague: any) => {
    setContactPickerOpen(false);
    sendMessageMutation.mutate({
      receiverId: activeContact.id,
      content: `👤 Contact Shared:\nName: ${colleague.firstName} ${colleague.lastName}\nEmail: ${colleague.email}\nPhone: ${colleague.phone || 'N/A'}\nDesignation: ${colleague.designation || 'Teammate'}`,
    });
    toast.success(`Contact card for ${colleague.firstName} shared.`);
  };

  // Event builder handler
  const handleShareEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !eventDate || !eventTime) {
      toast.error('Please fill in all event details.');
      return;
    }
    setEventModalOpen(false);
    sendMessageMutation.mutate({
      receiverId: activeContact.id,
      content: `📅 Event Invitation:\nTitle: ${eventName}\nDate: ${eventDate}\nTime: ${eventTime}\nDescription: ${eventDesc || 'No details provided.'}`,
    });
    toast.success('Event invitation sent!');
    setEventName('');
    setEventDate('');
    setEventTime('');
    setEventDesc('');
  };

  // Sticker share handler
  const handleShareSticker = (stickerEmoji: string) => {
    setStickerPanelOpen(false);
    sendMessageMutation.mutate({
      receiverId: activeContact.id,
      content: stickerEmoji,
    });
    toast.success('Sticker sent.');
  };

  // HTML5 Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([audioBlob], `voicenote-${Date.now()}.wav`, { type: 'audio/wav' });

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await api.uploadFile(formData);
          sendMessageMutation.mutate({
            receiverId: activeContact.id,
            voiceNoteUrl: response.url,
          });
          toast.success('Voice note sent!');
        } catch (err) {
          toast.error('Failed to upload voice note.');
        } finally {
          setUploading(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  // Poll creations & voting
  const handleAddPollOption = () => {
    setPollOptions((prev) => [...prev, '']);
  };

  const handlePollOptionChange = (idx: number, value: string) => {
    setPollOptions((prev) => prev.map((val, i) => (i === idx ? value : val)));
  };

  const handlePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) {
      toast.error('Please specify a question and at least 2 valid options.');
      return;
    }

    try {
      const payload = {
        receiverId: activeContact.id,
        question: pollQuestion,
        options: pollOptions.filter((o) => o.trim()),
      };
      await api.createPoll(payload);
      setPollModalOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      toast.success('Poll launched.');
    } catch (err) {
      toast.error('Failed to launch poll.');
    }
  };

  const handleVotePoll = async (optionId: string) => {
    try {
      const response = await api.votePoll(optionId);
      setMessages((prev) =>
        prev.map((m) => (m.poll?.id === response.id ? { ...m, poll: response } : m))
      );
    } catch (err) {
      toast.error('Failed to record vote.');
    }
  };

  // Filter and process lists
  const colleagues = directoryData?.users?.filter((u: any) => u.id !== user?.id) || [];

  const filteredColleagues = colleagues.filter((c: any) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.designation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecent = (recentChats || [])
    .filter((chat: any) => chat.type === 'DIRECT')
    .filter((chat: any) =>
      chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const recentIds = new Set(filteredRecent.map((chat: any) => chat.id));
  const remainingColleagues = searchQuery.trim() === ''
    ? []
    : filteredColleagues.filter((c: any) => !recentIds.has(c.id));

  // Client-side message search filter
  const displayedMessages = messages.filter((m) =>
    !msgSearchQuery ? true : m.content.toLowerCase().includes(msgSearchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm">
      {/* Sidebar Contacts List */}
      <aside className={`w-full md:w-80 border-r flex flex-col shrink-0 bg-slate-50/50 dark:bg-slate-900/50 ${activeContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">Direct Messages</h3>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <input
            type="text"
            placeholder="Search colleagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-[11px] focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Section: Recent Chats */}
          {loadingChats ? (
            <div className="space-y-3 px-3 py-2">
              <h4 className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider">Recent Conversations</h4>
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center space-x-3 p-2 rounded-xl animate-pulse-slow">
                  <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRecent.length > 0 ? (
            <div className="space-y-1">
              <h4 className="px-3 text-[9px] font-extrabold uppercase text-slate-450 tracking-wider">Recent Conversations</h4>
              {filteredRecent.map((chat: any) => {
                const active = activeContact && activeContact.id === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => setActiveContact({ id: chat.id, name: chat.name, avatarUrl: chat.avatarUrl, status: chat.status })}
                    className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                      active
                        ? 'bg-primary text-white shadow-sm'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="relative">
                      <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-xs uppercase text-slate-500 overflow-hidden shrink-0">
                        {chat.avatarUrl ? (
                          <img src={chat.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          chat.name ? chat.name.substring(0, 2) : 'DM'
                        )}
                      </div>
                      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        chat.status === 'ONLINE' ? 'bg-green-500' :
                        chat.status === 'AWAY' ? 'bg-amber-500' :
                        chat.status === 'BUSY' ? 'bg-red-500' :
                        chat.status === 'DND' ? 'bg-rose-600' :
                        chat.status === 'IN_MEETING' ? 'bg-indigo-500' :
                        chat.status === 'ON_LEAVE' ? 'bg-sky-500' :
                        'bg-slate-400'
                      }`} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-baseline gap-1">
                        <p className={`text-xs truncate ${active ? 'text-white font-bold' : chat.unreadCount > 0 ? 'text-slate-950 dark:text-white font-black' : 'text-foreground font-semibold'}`}>{chat.name}</p>
                        {chat.lastMessageAt && (
                          <span className={`text-[8px] font-medium shrink-0 ${active ? 'text-white/70' : chat.unreadCount > 0 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            {formatMessageTime(chat.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center gap-1.5 mt-0.5">
                        <p className={`text-[9px] truncate ${active ? 'text-white/80' : chat.unreadCount > 0 ? 'text-slate-900 dark:text-slate-200 font-extrabold' : 'text-muted-foreground'}`}>{chat.lastMessage}</p>
                        {chat.unreadCount > 0 && !active && (
                          <span className="h-4 min-w-[16px] px-1 rounded-full bg-green-500 text-white font-black text-[8px] flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : searchQuery.trim() === '' ? (
            <div className="text-center py-8 px-4 text-slate-400 space-y-2 animate-fade-in">
              <MessageSquare className="h-8 w-8 mx-auto text-slate-350 dark:text-slate-700 stroke-1" />
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">No recent chats</p>
              <p className="text-[9px] text-muted-foreground max-w-[160px] mx-auto leading-normal">Use the search box above to start a conversation with a colleague.</p>
            </div>
          ) : null}

          {/* Section: Search Results */}
          {searchQuery.trim() !== '' && (
            <div className="space-y-1">
              <h4 className="px-3 text-[9px] font-extrabold uppercase text-slate-405 tracking-wider">
                Search Results
              </h4>
              {loadingDirectory ? (
                <div className="text-center text-[10px] text-muted-foreground py-4">Loading directory...</div>
              ) : remainingColleagues.length === 0 ? (
                <div className="text-center text-[10px] text-muted-foreground py-4">No colleagues found.</div>
              ) : (
                remainingColleagues.map((colleague: any) => {
                  const fullName = `${colleague.firstName} ${colleague.lastName}`;
                  const active = activeContact && activeContact.id === colleague.id;
                  return (
                    <div
                      key={colleague.id}
                      onClick={() => setActiveContact({ id: colleague.id, name: fullName, avatarUrl: colleague.avatarUrl, status: colleague.status })}
                      className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                        active
                          ? 'bg-primary text-white shadow-sm'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="relative">
                        <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-xs uppercase text-slate-500 overflow-hidden shrink-0">
                          {colleague.avatarUrl ? (
                            <img src={colleague.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            `${colleague.firstName[0]}${colleague.lastName[0]}`
                          )}
                        </div>
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                           colleague.status === 'ONLINE' ? 'bg-green-500' :
                           colleague.status === 'AWAY' ? 'bg-amber-500' :
                           colleague.status === 'BUSY' ? 'bg-red-500' :
                           colleague.status === 'DND' ? 'bg-rose-600' :
                           colleague.status === 'IN_MEETING' ? 'bg-indigo-500' :
                           colleague.status === 'ON_LEAVE' ? 'bg-sky-500' :
                           'bg-slate-400'
                         }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${active ? 'text-white' : 'text-foreground'}`}>{fullName}</p>
                        <p className={`text-[9px] truncate ${active ? 'text-white/80' : 'text-muted-foreground'}`}>{colleague.designation || 'Teammate'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Messaging Workspace */}
      <section className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 ${activeContact ? 'flex' : 'hidden md:flex'}`}>
        {activeContact ? (
          <>
            {/* Header */}
            <div className="h-16 px-6 border-b flex items-center justify-between shrink-0 glass z-10">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveContact(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 md:hidden"
                  aria-label="Back to conversations list"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="relative">
                  <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-xs uppercase text-slate-500 overflow-hidden shrink-0">
                    {activeContact.avatarUrl ? (
                      <img src={activeContact.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      activeContact.name ? activeContact.name.substring(0, 2) : 'DM'
                    )}
                  </div>
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                     activeContact.status === 'ONLINE' ? 'bg-green-500' :
                     activeContact.status === 'AWAY' ? 'bg-amber-500' :
                     activeContact.status === 'BUSY' ? 'bg-red-500' :
                     activeContact.status === 'DND' ? 'bg-rose-600' :
                     activeContact.status === 'IN_MEETING' ? 'bg-indigo-500' :
                     activeContact.status === 'ON_LEAVE' ? 'bg-sky-500' :
                     'bg-slate-400'
                   }`} />
                 </div>
                 <div>
                   <h4 className="font-bold text-sm leading-none mb-1">{activeContact.name}</h4>
                   <div className="flex items-center space-x-2 text-[10px] text-muted-foreground font-semibold leading-none">
                     <span className="capitalize">
                       {activeContact.status === 'DND' ? 'Do Not Disturb' : activeContact.status.toLowerCase()}
                     </span>
                     {activeContact.status !== 'OFFLINE' && activeContact.devices && activeContact.devices.length > 0 && (
                       <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-wider uppercase leading-none">
                         on {activeContact.devices.join(', ')}
                       </span>
                     )}
                     {activeContact.status === 'OFFLINE' && activeContact.lastSeen && (
                       <span className="text-[9px] lowercase font-medium">
                         • seen {new Date(activeContact.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                     )}
                   </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowMsgSearch(!showMsgSearch)}
                  className={`p-2 rounded-lg border transition-all ${
                    showMsgSearch ? 'bg-primary/10 text-primary border-primary/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                  aria-label="Search conversation messages"
                >
                  <Search className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPollModalOpen(true)}
                  className="p-2 rounded-lg border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  title="Launch Poll"
                  aria-label="Create poll in conversation"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={`p-2 rounded-lg border transition-all ${
                    showInfoPanel ? 'bg-primary/10 text-primary border-primary/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                  title="Conversation Info"
                  aria-label="Toggle teammate info panel"
                >
                  <Info className="h-4 w-4" />
                </button>
                <div ref={clearMenuRef} className="relative shrink-0">
                  <button
                    onClick={() => setClearMenuOpen(!clearMenuOpen)}
                    className="p-2 rounded-lg border border-red-150 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-all"
                    title="Delete options"
                    aria-label="Delete options menu"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {clearMenuOpen && (
                    <div className="absolute right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-xl w-44 z-50 text-[10px] space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 text-left font-semibold">
                      <button
                        onClick={handleClearChatHistory}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg text-slate-700 dark:text-slate-350"
                      >
                        Clear Chat History
                      </button>
                      <button
                        onClick={handleDeleteConversation}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/25 rounded-lg text-red-600 font-bold"
                      >
                        Delete Conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inline message search bar */}
            {showMsgSearch && (
              <div className="px-6 py-2 border-b bg-slate-50/50 dark:bg-slate-900/50 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search conversation..."
                  value={msgSearchQuery}
                  onChange={(e) => setMsgSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-800 text-xs focus:outline-none"
                />
                <button onClick={() => { setMsgSearchQuery(''); setShowMsgSearch(false); }} className="text-slate-400 hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Message Viewport */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMessages ? (
                <div className="space-y-4 py-4">
                  {/* Left Skeleton Bubble */}
                  <div className="flex items-start space-x-3 max-w-[60%] animate-pulse-slow">
                    <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
                      <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-2xl rounded-tl-none w-full" />
                    </div>
                  </div>
                  {/* Right Skeleton Bubble */}
                  <div className="flex items-start justify-end space-x-3 max-w-[60%] ml-auto animate-pulse-slow">
                    <div className="space-y-1.5 flex-1 text-right">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4 ml-auto" />
                      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-2xl rounded-tr-none w-full" />
                    </div>
                  </div>
                  {/* Left Skeleton Bubble */}
                  <div className="flex items-start space-x-3 max-w-[45%] animate-pulse-slow">
                    <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                      <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl rounded-tl-none w-full" />
                    </div>
                  </div>
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 animate-fade-in">
                  <div className="h-12 w-12 bg-slate-50 dark:bg-slate-900 border rounded-full flex items-center justify-center text-slate-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {msgSearchQuery ? 'No matching messages found.' : 'No messages here yet'}
                  </p>
                  <p className="text-[10px] text-muted-foreground max-w-[200px]">
                    {msgSearchQuery ? 'Try searching for different terms or phrases.' : 'Send a message below to start your conversation!'}
                  </p>
                </div>
              ) : (
                displayedMessages.map((msg) => {
                  const self = msg.senderId === user?.id;
                  const isRead = msg.statuses?.some((s: any) => s.status === 'READ');
                  return (
                    <div key={msg.id} className={`flex flex-col ${self ? 'items-end' : 'items-start'} space-y-1 animate-fade-in`}>
                      
                      {/* Thread Reply Ancestor Header */}
                      {msg.parent && (
                        <div className="flex items-center space-x-1.5 text-[10px] text-muted-foreground mb-0.5">
                          <CornerUpLeft className="h-3 w-3 shrink-0" />
                          <span>Replying to {msg.parent.sender?.firstName || 'User'}</span>
                          <span className="italic truncate max-w-[120px]">"{msg.parent.content}"</span>
                        </div>
                      )}

                      {/* Forwarded Header */}
                      {msg.forwardedFromId && (
                        <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 font-extrabold uppercase tracking-wide mb-0.5">
                          <CornerUpRight className="h-3 w-3 shrink-0" />
                          <span>Forwarded</span>
                        </div>
                      )}

                      <div 
                        onContextMenu={(e) => {
                          if (msg.isDeleted || msg.isDeletedForEveryone || msg.content === 'This message was deleted.') {
                            return;
                          }
                          e.preventDefault();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            message: msg
                          });
                        }}
                        className={`flex items-start gap-2 max-w-[70%] group`}
                      >
                        {/* Hover Quick Actions */}
                        {!msg.isDeleted && !msg.isDeletedForEveryone && msg.content !== 'This message was deleted.' && (
                          <div className={`opacity-0 group-hover:opacity-100 transition-all flex items-center space-x-1 shrink-0 self-center ${self ? 'order-first' : 'order-last'}`}>
                            <button onClick={() => setReplyingMessage(msg)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400" title="Reply">
                              <CornerUpLeft className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setForwardingMessage(msg)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400" title="Forward">
                              <CornerUpRight className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleTogglePin(msg.id)} className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded ${msg.isPinned ? 'text-primary' : 'text-slate-400'}`} title="Pin message">
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleToggleBookmark(msg.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400" title="Bookmark">
                              <Bookmark className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleCopyText(msg.content)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400" title="Copy Text">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            {self && (() => {
                              const canEdit = (Date.now() - new Date(msg.createdAt).getTime()) <= 15 * 60 * 1000;
                              if (!canEdit) return null;
                              return (
                                <button onClick={() => { setEditingMessage(msg); setEditValue(msg.content); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400" title="Edit message">
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              );
                            })()}
                            <div className="relative group/del">
                              <button className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <div className="absolute top-6 right-0 bg-white dark:bg-slate-800 border rounded-lg shadow-xl hidden group-hover/del:block py-1 text-[10px] w-28 z-30">
                                <button onClick={() => handleDeleteMessage(msg.id, 'FOR_ME')} className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700">Delete for me</button>
                                {self && (
                                  <button onClick={() => handleDeleteMessage(msg.id, 'FOR_EVERYONE')} className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-red-500 font-bold">Delete for all</button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className={`p-3.5 rounded-2xl text-xs leading-relaxed border ${
                          self
                            ? 'bg-primary text-white border-primary shadow-sm rounded-tr-none'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-tl-none'
                        }`}>
                          {msg.isDeleted || msg.isDeletedForEveryone || msg.content === 'This message was deleted.' ? (
                            <p className="italic opacity-60 flex items-center space-x-1.5">
                              <span>This message was deleted.</span>
                            </p>
                          ) : (
                            <>
                              {isGifUrl(msg.content) ? (
                                <img src={msg.content} alt="GIF" className="rounded-xl max-w-[240px] max-h-[180px] object-cover shadow-sm border border-slate-200 dark:border-slate-700 mt-1" />
                              ) : (
                                <div>{renderFormattedText(msg.content)}</div>
                              )}

                              {msg.isEdited && (
                                <div className="mt-1 flex items-center justify-end space-x-1 text-[9px] opacity-75 select-none relative">
                                  <span 
                                    onClick={() => setShowEditHistoryMessageId(showEditHistoryMessageId === msg.id ? null : msg.id)}
                                    className="cursor-pointer hover:underline flex items-center space-x-0.5"
                                    title="View edit log"
                                  >
                                    <History className="h-2.5 w-2.5" />
                                    <span>Edited</span>
                                  </span>

                                  {/* Mini Edit History Overlay Box */}
                                  {showEditHistoryMessageId === msg.id && (
                                    <div className="absolute right-0 bottom-4 bg-white dark:bg-slate-900 border rounded-xl p-2.5 shadow-xl text-foreground text-[10px] w-48 z-40 space-y-1 text-left animate-fade-in">
                                      <p className="font-bold border-b pb-1 text-[9px] text-slate-400 uppercase tracking-wider">Message Edit Log</p>
                                      <div className="space-y-1 py-1 max-h-24 overflow-y-auto">
                                        <div className="border-l-2 border-indigo-500 pl-1.5">
                                          <p className="text-slate-400 text-[8px] font-medium">Original Version</p>
                                          <p className="italic text-slate-600 dark:text-slate-400 break-words">"{msg.content.slice(0, 40)}..."</p>
                                        </div>
                                        <div className="border-l-2 border-emerald-500 pl-1.5">
                                          <p className="text-slate-400 text-[8px] font-medium">Dispatched At</p>
                                          <p className="text-slate-600 dark:text-slate-400 font-bold">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}

                          {/* Render Poll interface */}
                          {!msg.isDeleted && !msg.isDeletedForEveryone && msg.content !== 'This message was deleted.' && msg.poll && (
                            <div className="mt-3 p-3 bg-white dark:bg-slate-900 border rounded-xl space-y-2 text-foreground shadow-sm max-w-[280px]">
                              <p className="font-bold text-xs border-b pb-1.5">{msg.poll.question}</p>
                              <div className="space-y-2 pt-1 text-[10px]">
                                {msg.poll.options?.map((opt: any) => {
                                  const totalVotes = msg.poll.options.reduce((sum: number, o: any) => sum + (o.votes?.length || 0), 0);
                                  const votesCount = opt.votes?.length || 0;
                                  const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                                  const hasVoted = opt.votes?.some((v: any) => v.userId === user?.id);

                                  return (
                                    <div
                                      key={opt.id}
                                      onClick={() => handleVotePoll(opt.id)}
                                      className={`p-2 border rounded-lg cursor-pointer transition-all hover:bg-primary/5 relative overflow-hidden ${
                                        hasVoted ? 'border-primary bg-primary/5 font-extrabold' : ''
                                      }`}
                                    >
                                      {/* Bar visualizer progress fill */}
                                      <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all" style={{ width: `${percentage}%` }} />
                                      <div className="relative flex justify-between items-center">
                                        <span>{opt.text}</span>
                                        <span className="text-slate-400 font-bold">{votesCount} ({percentage}%)</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Render Voice Note */}
                          {!msg.isDeleted && !msg.isDeletedForEveryone && msg.content !== 'This message was deleted.' && msg.voiceNoteUrl && (
                            <div className="mt-2.5">
                              <audio controls src={resolveFileUrl(msg.voiceNoteUrl)} className="max-w-[200px] h-8 text-xs focus:outline-none" />
                            </div>
                          )}

                          {/* Render Attachments */}
                          {!msg.isDeleted && !msg.isDeletedForEveryone && msg.content !== 'This message was deleted.' && msg.attachments?.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-white/20 space-y-2">
                              {msg.attachments.map((att: any) => {
                                const isImage = ['PNG', 'JPEG', 'JPG', 'GIF', 'WEBP'].includes(att.file?.fileType?.toUpperCase());
                                const resolvedUrl = resolveFileUrl(att.file.url);
                                const fileObj = { name: att.file?.name, url: att.file?.url, fileType: att.file?.fileType };
                                return (
                                  <div key={att.id} className="space-y-1.5 text-left">
                                    {isImage ? (
                                      <div className="relative group max-w-[220px] rounded-xl overflow-hidden border border-white/20 shadow-md">
                                        <img 
                                          src={resolvedUrl} 
                                          alt={att.file?.name} 
                                          className="max-h-[160px] w-full object-cover cursor-pointer hover:scale-102 transition-all"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all">
                                          <button
                                            type="button"
                                            onClick={() => setPreviewFile(fileObj)}
                                            className="px-2.5 py-1 bg-white text-slate-800 rounded-lg shadow hover:bg-slate-100 transition-all font-bold text-[10px]"
                                          >
                                            Preview
                                          </button>
                                          <a 
                                            href={resolvedUrl} 
                                            download={att.file?.name}
                                            className="px-2.5 py-1 bg-primary text-white rounded-lg shadow hover:bg-primary/95 transition-all font-bold text-[10px]"
                                          >
                                            Download
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={`flex flex-col p-2.5 rounded-xl border text-[11px] space-y-2 ${
                                        self ? 'bg-white/10' : 'bg-slate-100'
                                      }`}>
                                        <div className="flex items-center space-x-2">
                                          <FileText className="h-4 w-4 shrink-0" />
                                          <span className="truncate max-w-[150px] font-bold text-slate-800 dark:text-slate-200">{att.file?.name}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 pt-1.5 border-t border-dashed border-slate-300/40">
                                          <button
                                            type="button"
                                            onClick={() => setPreviewFile(fileObj)}
                                            className={`px-2 py-1 rounded-lg font-bold text-[9px] ${
                                              self ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                            }`}
                                          >
                                            Preview
                                          </button>
                                          <a 
                                            href={resolvedUrl} 
                                            download={att.file?.name}
                                            className="px-2 py-1 bg-primary text-white rounded-lg font-bold text-[9px] hover:bg-primary/95 transition-all"
                                          >
                                            Download
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Display Reactions */}
                      {!msg.isDeleted && !msg.isDeletedForEveryone && msg.content !== 'This message was deleted.' && msg.reactions?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {msg.reactions.map((react: any, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border rounded-full text-[10px] shadow-sm">
                              {react.emoji}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Info bar */}
                      <div className="flex items-center space-x-1.5 text-[9px] text-slate-400">
                        {msg.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {msg.isEdited && <span className="opacity-80 font-bold lowercase text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded leading-none">edited</span>}
                        {self && (
                          <span>
                            {isRead ? (
                              <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {typingStatus && (
                <div className="text-[10px] text-slate-400 italic font-semibold flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span>{typingStatus}</span>
                </div>
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Edit Message Modal */}
            {editingMessage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border w-full max-w-md space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-sm">Edit Message</h4>
                    <button onClick={() => setEditingMessage(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form onSubmit={handleEditMessage} className="space-y-4">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                    />
                    <button type="submit" className="w-full py-2 bg-primary text-white rounded-xl text-xs font-bold">
                      Save Changes
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Forward Message Modal */}
            {forwardingMessage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs">
                <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative">
                  <button onClick={() => setForwardingMessage(null)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
                    <X className="h-5 w-5" />
                  </button>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm">Forward Message</h3>
                    <p className="text-xs text-slate-400">Select a colleague to forward this message content to.</p>
                  </div>
                  <form onSubmit={handleForwardSubmit} className="space-y-4 text-xs font-semibold">
                    <div className="space-y-2">
                      <label className="text-slate-400 uppercase text-[10px]">Select Teammate</label>
                      <select
                        required
                        value={forwardingTargetUser}
                        onChange={(e) => setForwardingTargetUser(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                      >
                        <option value="">-- Choose recipient --</option>
                        {colleagues.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                        ))}
                      </select>
                    </div>

                    <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                      Forward Message
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Poll Creation Modal */}
            {pollModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs">
                <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
                  <button onClick={() => setPollModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
                    <X className="h-5 w-5" />
                  </button>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm">Launch Option Poll</h3>
                    <p className="text-xs text-slate-400">Allow colleagues to vote on options directly inside the chatroom.</p>
                  </div>
                  <form onSubmit={handlePollSubmit} className="space-y-4 text-xs font-semibold">
                    <div className="space-y-2">
                      <label className="text-slate-400 uppercase text-[10px]">Question</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. What time is the sprint planning meeting?"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-slate-400 uppercase text-[10px]">Options</label>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {pollOptions.map((opt, idx) => (
                          <input
                            key={idx}
                            type="text"
                            required
                            placeholder={`Option ${idx + 1}`}
                            value={opt}
                            onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPollOption}
                        className="mt-1 text-[10px] text-primary font-bold hover:underline inline-flex items-center space-x-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Option</span>
                      </button>
                    </div>

                    <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                      Launch Poll
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Input Footer */}
            <div className="p-4 border-t shrink-0 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 relative">
              {mentionOpen && filteredMentionUsers.length > 0 && (
                <div className="absolute bottom-full mb-2 left-4 right-4 bg-white dark:bg-slate-800 border dark:border-slate-750 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <p className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider px-2.5 py-1">Mention Colleague</p>
                  {filteredMentionUsers.map((u: any) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectMention(u)}
                      className="flex items-center space-x-2.5 p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-all"
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] uppercase overflow-hidden shrink-0">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          `${u.firstName[0]}${u.lastName[0]}`
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{u.firstName} {u.lastName}</p>
                        <p className="text-[9px] text-slate-400 truncate leading-none mt-1">{u.designation || u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Reply Preview Bar */}
              {replyingMessage && (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-xs font-semibold">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <CornerUpLeft className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-slate-400">Replying to {replyingMessage.sender?.firstName}:</span>
                    <span className="truncate text-slate-600 dark:text-slate-350">"{replyingMessage.content}"</span>
                  </div>
                  <button onClick={() => setReplyingMessage(null)} className="text-slate-400 hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2 border-b">
                  {attachedFiles.map((file) => (
                    <div key={file.id} className="flex items-center space-x-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-xl text-[10px] text-primary font-bold">
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button onClick={() => setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Rich text formatting & Message scheduling toolbar */}
              {!isBlocked && (
                <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-t text-[10px] text-slate-400 select-none">
                  <div className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={() => setInputValue(prev => prev + '**bold**')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
                      title="Bold Text (**text**)"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputValue(prev => prev + '*italic*')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded italic text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
                      title="Italic Text (*text*)"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputValue(prev => prev + '`code`')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
                      title="Code Format (`code`)"
                    >
                      <Code className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {scheduledDate && (
                      <div className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded flex items-center space-x-1">
                        <span>Sched: {new Date(scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button type="button" onClick={() => setScheduledDate('')} className="hover:text-red-500 font-extrabold">×</button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowScheduler(!showScheduler)}
                      className={`p-1 rounded flex items-center space-x-0.5 transition-all ${showScheduler ? 'bg-primary/10 text-primary' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500'}`}
                      title="Schedule message delivery"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-bold">Schedule</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Scheduling datetime picker popover */}
              {!isBlocked && showScheduler && (
                <div className="p-3 bg-white dark:bg-slate-900 border-b flex items-center justify-between animate-fade-in select-none">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider shrink-0">Deliver At:</span>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="px-2.5 py-1 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScheduler(false)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold rounded-lg transition-all"
                  >
                    Done
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center space-x-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="relative">
                  <button
                    type="button"
                    disabled={isBlocked}
                    onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
                    className={`p-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center disabled:opacity-30 ${
                      attachmentMenuOpen 
                        ? 'bg-primary text-white scale-110 shadow-md rotate-45' 
                        : 'hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700'
                    }`}
                    title="Attach file"
                  >
                    <Plus className="h-5 w-5 transition-transform duration-200" />
                  </button>

                  {/* Attachment Popover Menu */}
                  {attachmentMenuOpen && (
                    <div className="absolute bottom-14 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-3 rounded-2xl shadow-2xl z-50 w-56 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
                      
                      {/* Document */}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-full group-hover:scale-110 transition-all shadow-sm">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 mt-1">Document</span>
                      </button>

                      {/* Photos & Videos */}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-full group-hover:scale-110 transition-all shadow-sm">
                          <FileImage className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 mt-1">Gallery</span>
                      </button>

                      {/* Camera */}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentMenuOpen(false);
                          startCamera();
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-full group-hover:scale-110 transition-all shadow-sm">
                          <Camera className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-650 dark:text-slate-300 mt-1">Camera</span>
                      </button>

                      {/* Audio */}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-full group-hover:scale-110 transition-all shadow-sm">
                          <Headphones className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-650 dark:text-slate-300 mt-1">Audio</span>
                      </button>

                      {/* Contact */}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentMenuOpen(false);
                          setContactPickerOpen(true);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-full group-hover:scale-110 transition-all shadow-sm">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-650 dark:text-slate-300 mt-1">Contact</span>
                      </button>

                      {/* Poll */}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentMenuOpen(false);
                          setPollModalOpen(true);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-full group-hover:scale-110 transition-all shadow-sm">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-650 dark:text-slate-300 mt-1">Poll</span>
                      </button>

                      {/* Event */}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentMenuOpen(false);
                          setEventModalOpen(true);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-full group-hover:scale-110 transition-all shadow-sm">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-650 dark:text-slate-300 mt-1">Event</span>
                      </button>

                      {/* Stickers */}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentMenuOpen(false);
                          setStickerPanelOpen(true);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <div className="p-2.5 bg-pink-500/10 text-pink-500 rounded-full group-hover:scale-110 transition-all shadow-sm">
                          <Smile className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-650 dark:text-slate-300 mt-1">Sticker</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Voice recording controls */}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    disabled={isBlocked}
                    className="p-2.5 bg-red-500 text-white rounded-xl transition-all shrink-0 flex items-center justify-center animate-pulse disabled:opacity-30"
                    title="Stop and send recording"
                  >
                    <MicOff className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isBlocked}
                    className="p-2.5 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all shrink-0 disabled:opacity-30"
                    title="Record voice note"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                )}

                <input
                  type="text"
                  readOnly={isBlocked}
                  onClick={() => {
                    if (isBlocked) {
                      handleToggleBlock();
                    }
                  }}
                  placeholder={isBlocked ? "You blocked this contact. Click to unblock." : "Type a message..."}
                  value={isBlocked ? "" : inputValue}
                  onChange={handleInputChange}
                  className={`flex-1 min-w-0 px-4 py-3 rounded-xl border transition-all text-xs ${
                    isBlocked 
                      ? 'bg-red-50 dark:bg-red-950/20 text-red-550 border-red-200 dark:border-red-900 cursor-pointer font-bold text-center' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary'
                  }`}
                />

                <div className="hidden sm:flex items-center space-x-1 shrink-0">
                  {['👍', '❤️', '👏'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      disabled={isBlocked}
                      onClick={() => {
                        if (messages.length > 0) {
                          handleAddReaction(messages[messages.length - 1].id, emoji);
                        }
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-sm shrink-0 disabled:opacity-30"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isBlocked || (!inputValue.trim() && attachedFiles.length === 0)}
                  className="p-3 bg-primary text-white rounded-xl hover:bg-primary/95 transition-all shadow-md shrink-0 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 text-center text-slate-400">
            <MessageSquare className="h-16 w-16 stroke-1" />
            <div>
              <h3 className="font-bold text-base text-foreground">No Chat Selected</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Pick an employee conversation from the left bar or head to the Colleague Directory.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Right Conversation Info sidebar panel */}
      {showInfoPanel && activeContact && (() => {
        const sharedMedia = messages
          .filter((msg) => !msg.isDeleted && msg.attachments && msg.attachments.length > 0)
          .flatMap((msg) => msg.attachments)
          .map((att) => att.file)
          .filter(Boolean);

        return (
          <aside className="fixed md:relative inset-y-0 right-0 w-full md:w-80 border-l flex flex-col shrink-0 bg-white dark:bg-slate-900 p-4 space-y-5 overflow-y-auto z-50 md:z-20 shadow-2xl md:shadow-none animate-in slide-in-from-right-5 duration-250">
            {/* Hidden avatar input */}
            <input
              type="file"
              ref={contactAvatarRef}
              onChange={handleContactAvatarUpload}
              className="hidden"
              accept="image/*"
            />

            {/* Panel Header */}
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <button onClick={() => { setShowInfoPanel(false); setIsEditingContact(false); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                  <X className="h-4 w-4" />
                </button>
                <span className="font-bold text-sm text-slate-850 dark:text-slate-200">Contact info</span>
              </div>
              
              {/* Edit Contact Button */}
              {activeContact.type === 'GROUP' && (
                <button
                  onClick={() => setIsEditingContact(!isEditingContact)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    isEditingContact 
                      ? 'bg-primary text-white border-primary' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 border-transparent'
                  }`}
                  title="Edit Contact Info"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Profile Avatar & Name Area */}
            <div className="text-center pb-4 border-b">
              <div className="relative group/avatar mx-auto h-28 w-28 rounded-full overflow-hidden shadow-md">
                <div className="h-full w-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-3xl uppercase text-slate-500 overflow-hidden">
                  {activeContact.avatarUrl ? (
                    <img src={activeContact.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    activeContact.name ? activeContact.name.substring(0, 2) : 'DM'
                  )}
                </div>
                {/* Change photo hover overlay */}
                <div 
                  onClick={() => contactAvatarRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-all duration-200"
                >
                  <Camera className="h-5 w-5 mb-1" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Change photo</span>
                </div>
              </div>

              {/* Edit Mode Form */}
              {isEditingContact ? (
                <form onSubmit={handleSaveProfile} className="space-y-3 pt-3 text-left">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">First Name</label>
                    <input
                      type="text"
                      required
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-850 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">Last Name</label>
                    <input
                      type="text"
                      required
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-850 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      placeholder="e.g. +91 81279 91402"
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-850 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">About / Biography</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-850 focus:outline-none resize-none h-16"
                    />
                  </div>
                  <div className="flex space-x-2 pt-2 text-[10px] font-bold">
                    <button
                      type="submit"
                      disabled={updatingProfile}
                      className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary/95 disabled:opacity-50"
                    >
                      {updatingProfile ? 'Saving...' : 'Save Info'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(false)}
                      className="flex-1 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-2 mt-4">
                  <h4 className="font-bold text-base leading-snug">{activeContact.name}</h4>
                  {activeContact.type !== 'GROUP' && (
                    <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold">{contactProfile?.phone || '+91 81279 91402'}</p>
                  )}
                  <div className="pt-1.5">
                    <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${
                      activeContact.status === 'ONLINE' ? 'bg-green-500/10 text-green-500 border-green-200/30' :
                      activeContact.status === 'AWAY' ? 'bg-amber-500/10 text-amber-500 border-amber-200/30' :
                      activeContact.status === 'BUSY' ? 'bg-red-500/10 text-red-500 border-red-200/30' :
                      activeContact.status === 'DND' ? 'bg-rose-500/10 text-rose-500 border-rose-200/30' :
                      activeContact.status === 'IN_MEETING' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-200/30' :
                      activeContact.status === 'ON_LEAVE' ? 'bg-sky-500/10 text-sky-500 border-sky-200/30' :
                      'bg-slate-500/10 text-slate-500 border-slate-200/30'
                    }`}>
                      {activeContact.status === 'IN_MEETING' ? 'In Meeting' : activeContact.status === 'ON_LEAVE' ? 'On Leave' : activeContact.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Quick Actions (Search & Call) */}
            {!isEditingContact && activeContact.type !== 'GROUP' && (
              <div className="grid grid-cols-2 gap-4 py-1 border-b pb-4">
                <div className="flex flex-col items-center justify-center py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all" onClick={() => setShowMsgSearch(true)}>
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-350">
                    <Search className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 mt-1">Search</span>
                </div>
                <div className="flex flex-col items-center justify-center py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all" onClick={() => {
                  const num = contactProfile?.phone || '+91 81279 91402';
                  toast.success(`Dialing ${num}...`);
                }}>
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-350">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 mt-1">Voice call</span>
                </div>
              </div>
            )}

            {/* About Biography Section */}
            {!isEditingContact && activeContact.type !== 'GROUP' && (
              <div className="space-y-1.5 text-left pt-2 pb-2 border-b">
                <h5 className="text-[9px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">About</h5>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-dashed">
                  {contactProfile?.bio || 'Hey there! I am using ConnectHub.'}
                </p>
              </div>
            )}

            {/* Media Links & Docs Section */}
            {!isEditingContact && (
              <div className="space-y-3 pt-2 pb-2 border-b">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <span>Media, links and docs</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-black">{sharedMedia.length}</span>
                </div>
                {sharedMedia.length === 0 ? (
                  <p className="text-[10px] text-slate-450 italic text-left">No media shared yet.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {sharedMedia.slice(0, 4).map((media: any, idx: number) => {
                      const isImg = ['PNG', 'JPEG', 'JPG', 'GIF', 'WEBP'].includes(media.fileType?.toUpperCase());
                      const resolvedUrl = resolveFileUrl(media.url);
                      return (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
                          {isImg ? (
                            <img
                              src={resolvedUrl}
                              alt=""
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-all"
                              onClick={() => setPreviewFile(media)}
                            />
                          ) : (
                            <div
                              onClick={() => setPreviewFile(media)}
                              className="w-full h-full flex items-center justify-center cursor-pointer text-slate-450 hover:bg-slate-200 dark:hover:bg-slate-700"
                              title={media.name}
                            >
                              <FileText className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Starred M            {/* Starred Messages Link Row */}
            {!isEditingContact && (
              <div className="space-y-3">
                {/* Starred messages link */}
                <div className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  <Bookmark className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-750 dark:text-slate-300 flex-1 text-left">Starred messages</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-black">{bookmarkedList?.length || 0}</span>
                </div>

                {/* Mute notifications */}
                {activeContact.type !== 'GROUP' && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border rounded-xl">
                    <div className="flex items-center space-x-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <VolumeX className={`h-4 w-4 ${isMuted ? 'text-red-500' : 'text-slate-400'}`} />
                      <span>Mute notifications</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isMuted} 
                        onChange={(e) => {
                          setIsMuted(e.target.checked);
                          toast.success(e.target.checked ? 'Notifications muted.' : 'Notifications unmuted.');
                        }} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                )}

                {/* Disappearing messages */}
                <div 
                  onClick={() => setShowDisappearingModal(true)}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <div className="flex items-center space-x-3 text-xs font-bold text-slate-700 dark:text-slate-300 text-left">
                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <p>Disappearing messages</p>
                      <p className="text-[9px] text-slate-400 font-medium">{disappearingDuration === 'off' ? 'off' : disappearingDuration}</p>
                    </div>
                  </div>
                </div>

                {/* Advanced chat privacy */}
                {activeContact.type !== 'GROUP' && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border rounded-xl">
                    <div className="flex items-center space-x-3 text-xs font-bold text-slate-700 dark:text-slate-300 text-left">
                      <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                      <div>
                        <p>Advanced chat privacy</p>
                        <p className="text-[9px] text-slate-400 font-medium">off</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={privacyEnabled} 
                        onChange={(e) => {
                          setPrivacyEnabled(e.target.checked);
                          toast.success(e.target.checked ? 'Advanced privacy enabled.' : 'Advanced privacy disabled.');
                        }} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                )}

                {/* Encryption row */}
                <div 
                  onClick={() => setShowEncryptionModal(true)}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <div className="flex items-center space-x-3 text-xs font-bold text-slate-700 dark:text-slate-300 text-left">
                    <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p>Encryption</p>
                      <p className="text-[9px] text-slate-450 font-medium leading-tight truncate">Messages are end-to-end encrypted. Click to verify.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Favourites & Add to List */}
            {!isEditingContact && activeContact.type !== 'GROUP' && (
              <div className="space-y-2.5 pt-1 pb-1">
                <div 
                  onClick={() => {
                    setIsFavourite(!isFavourite);
                    toast.success(!isFavourite ? 'Added to favourites!' : 'Removed from favourites.');
                  }}
                  className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <Heart className={`h-4 w-4 ${isFavourite ? 'text-pink-500 fill-pink-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-750 dark:text-slate-300 flex-1 text-left">Add to favourites</span>
                </div>

                <div 
                  onClick={() => toast.success('Added to custom chat list.')}
                  className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <Plus className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-750 dark:text-slate-300 flex-1 text-left">Add to list</span>
                </div>
              </div>
            )}

            {/* Starred / Pinned lists */}
            <div className="space-y-2.5 pt-2">
              <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center space-x-1">
                <Pin className="h-3 w-3 text-primary" />
                <span>Pinned Messages ({messages.filter((m) => m.isPinned).length})</span>
              </h4>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {messages.filter((m) => m.isPinned).length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-left">No pinned messages.</p>
                ) : (
                  messages
                    .filter((m) => m.isPinned)
                    .map((m) => (
                      <div key={m.id} className="p-2.5 border bg-white dark:bg-slate-900 rounded-xl space-y-1 relative text-[10px] text-left">
                        <div className="flex justify-between text-[8px] text-slate-450 font-bold border-b pb-1">
                          <span>{m.senderId === user?.id ? 'You' : activeContact.name}</span>
                          <span>{formatMessageTime(m.createdAt)}</span>
                        </div>
                        <p className="text-slate-655 dark:text-slate-355 pt-1 line-clamp-2">{m.content}</p>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center space-x-1">
                <Bookmark className="h-3 w-3 text-primary" />
                <span>My Starred Messages ({bookmarkedList?.length || 0})</span>
              </h4>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {!bookmarkedList || bookmarkedList.length === 0 ? (
                  <p className="text-[10px] text-slate-450 italic text-left">No bookmarked messages.</p>
                ) : (
                  bookmarkedList.map((bm: any) => (
                    <div key={bm.id} className="p-2.5 border bg-white dark:bg-slate-900 rounded-xl space-y-1 text-[10px] text-left">
                      <div className="flex justify-between text-[8px] text-slate-450 font-bold border-b pb-1">
                        <span>{bm.message?.senderId === user?.id ? 'You' : (bm.message?.sender?.firstName || 'Colleague')}</span>
                        <span>{formatMessageTime(bm.message?.createdAt)}</span>
                      </div>
                      <p className="text-slate-655 dark:text-slate-355 pt-1 line-clamp-2">{bm.message?.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Clear, Block, Report, Delete actions */}
            {!isEditingContact && activeContact.type !== 'GROUP' && (
              <div className="space-y-2.5 pt-4 border-t text-xs font-bold shrink-0 text-left">
                <button 
                  onClick={handleClearChatHistory}
                  className="w-full py-2.5 px-4 text-red-500 border border-red-200 dark:border-red-950/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/10 flex items-center space-x-2 animate-all"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear Chat History</span>
                </button>
                <button 
                  onClick={handleToggleBlock}
                  className="w-full py-2.5 px-4 text-red-500 border border-red-200 dark:border-red-950/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/10 flex items-center space-x-2 animate-all"
                >
                  <Shield className="h-4 w-4 text-red-500" />
                  <span>{isBlocked ? 'Unblock' : 'Block'} {activeContact.name}</span>
                </button>
                <button 
                  onClick={() => toast.success('Report submitted. We will review this contact shortly.')}
                  className="w-full py-2.5 px-4 text-red-500 border border-red-200 dark:border-red-950/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/10 flex items-center space-x-2 animate-all"
                >
                  <AlertOctagon className="h-4 w-4 text-red-500" />
                  <span>Report {activeContact.name}</span>
                </button>
                <button 
                  onClick={handleDeleteConversation}
                  className="w-full py-2.5 px-4 text-red-550 border border-red-200 dark:border-red-950/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/10 flex items-center space-x-2 animate-all"
                >
                  <Trash className="h-4 w-4" />
                  <span>Delete Chat</span>
                </button>
              </div>
            )}
          </aside>
        );
      })()}

      {/* Floating Context Menu */}
      {contextMenu && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-2xl py-1 text-xs w-40 z-50 animate-slide-up"
        >
          <button 
            onClick={() => setReplyingMessage(contextMenu.message)} 
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-200"
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            <span>Reply</span>
          </button>
          <button 
            onClick={() => setForwardingMessage(contextMenu.message)} 
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-200"
          >
            <CornerUpRight className="h-3.5 w-3.5" />
            <span>Forward</span>
          </button>
          <button 
            onClick={() => handleTogglePin(contextMenu.message.id)} 
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-200"
          >
            <Pin className="h-3.5 w-3.5" />
            <span>{contextMenu.message.isPinned ? 'Unpin' : 'Pin'}</span>
          </button>
          <button 
            onClick={() => handleToggleBookmark(contextMenu.message.id)} 
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-200"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Bookmark</span>
          </button>
          <button 
            onClick={() => handleCopyText(contextMenu.message.content)} 
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-200"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Text</span>
          </button>
          {contextMenu.message.senderId === user?.id && (
            <>
              {(() => {
                const canEdit = (Date.now() - new Date(contextMenu.message.createdAt).getTime()) <= 15 * 60 * 1000;
                if (!canEdit) return null;
                return (
                  <button 
                    onClick={() => { setEditingMessage(contextMenu.message); setEditValue(contextMenu.message.content); }} 
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-200"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                );
              })()}
              <button 
                onClick={() => handleDeleteMessage(contextMenu.message.id, 'FOR_EVERYONE')} 
                className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 font-bold flex items-center space-x-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete for all</span>
              </button>
            </>
          )}
          <button 
            onClick={() => handleDeleteMessage(contextMenu.message.id, 'FOR_ME')} 
            className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 flex items-center space-x-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete for me</span>
          </button>
        </div>
      )}

      {/* File Preview Modal Overlay */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setPreviewFile(null)} 
              className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="border-b pb-2">
              <h3 className="font-bold text-sm leading-none text-slate-800 dark:text-slate-200">{previewFile.name}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Format: {previewFile.fileType}</p>
            </div>

            {/* Preview Area */}
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl border p-4 flex items-center justify-center min-h-[300px]">
              {previewFile.fileType === 'PNG' || previewFile.fileType === 'JPEG' || previewFile.fileType === 'JPG' || previewFile.fileType === 'WEBP' || previewFile.fileType === 'GIF' ? (
                <img src={resolveFileUrl(previewFile.url)} alt={previewFile.name} className="max-h-[400px] object-contain rounded-lg shadow-sm" />
              ) : previewFile.fileType === 'MP4' ? (
                <video src={resolveFileUrl(previewFile.url)} controls className="max-h-[400px] w-full rounded-lg" />
              ) : (
                <div className="text-center space-y-4">
                  <FileText className="h-16 w-16 text-primary mx-auto stroke-1" />
                  <p className="text-xs text-muted-foreground">
                    Inline previewing is not supported for {previewFile.fileType} files. Please download to view.
                  </p>
                  <a
                    href={resolveFileUrl(previewFile.url)}
                    download={previewFile.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow hover:bg-primary/95 transition-all"
                  >
                    Download Document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-lg space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 text-center">
            <button onClick={stopCamera} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">Camera</h3>
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={capturePhoto}
                className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2"
              >
                <Camera className="h-4 w-4" />
                <span>Capture and Send</span>
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-2.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-350 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Picker Modal */}
      {contactPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setContactPickerOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 text-left">Share Contact</h3>
              <p className="text-xs text-slate-400 text-left">Select a colleague to share their details in this chat room.</p>
            </div>
            <div className="space-y-2 pt-2">
              {colleagues.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-left">No contacts available.</p>
              ) : (
                colleagues.map((col: any) => (
                  <div
                    key={col.id}
                    onClick={() => handleShareContact(col)}
                    className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all text-left"
                  >
                    <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-xs uppercase text-slate-500 overflow-hidden shrink-0">
                      {col.avatarUrl ? (
                        <img src={col.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        `${col.firstName[0]}${col.lastName[0]}`
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{col.firstName} {col.lastName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{col.designation || 'Teammate'} • {col.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Invitation Creator Modal */}
      {eventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setEventModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 text-left">Create Event Card</h3>
              <p className="text-xs text-slate-400 text-left">Construct an event invitation card to share in the chat.</p>
            </div>
            <form onSubmit={handleShareEvent} className="space-y-4 text-xs font-semibold text-left">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project Sprint Planning"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Time</label>
                  <input
                    type="time"
                    required
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Description</label>
                <textarea
                  placeholder="Enter event details/link..."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                Send Event Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sticker Selector Modal */}
      {stickerPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => { setStickerPanelOpen(false); setGifSearchQuery(''); }} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            
            {/* Modal Tabs */}
            <div className="flex items-center space-x-4 border-b pb-2 select-none">
              <button
                onClick={() => setActiveStickerTab('stickers')}
                className={`text-sm font-bold pb-1 transition-all ${activeStickerTab === 'stickers' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Stickers
              </button>
              <button
                onClick={() => setActiveStickerTab('gifs')}
                className={`text-sm font-bold pb-1 transition-all ${activeStickerTab === 'gifs' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
              >
                GIFs
              </button>
            </div>

            {activeStickerTab === 'stickers' ? (
              <div className="grid grid-cols-4 gap-4 p-2">
                {['🚀', '🎉', '👍', '❤️', '👏', '🔥', '💡', '🤔', '🌟', '👀', '💻', '🥳'].map((sticker, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleShareSticker(sticker)}
                    className="text-4xl hover:scale-125 cursor-pointer text-center select-none transition-all py-2"
                  >
                    {sticker}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Search preset GIFs..."
                  value={gifSearchQuery}
                  onChange={(e) => setGifSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-850 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-800 dark:text-slate-100"
                />
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {PRESET_GIFS.filter(g => g.name.toLowerCase().includes(gifSearchQuery.toLowerCase())).map((gif, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        handleShareSticker(gif.url);
                        setGifSearchQuery('');
                      }}
                      className="border rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-all relative group h-16 bg-slate-100 dark:bg-slate-800"
                    >
                      <img src={gif.url} alt={gif.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] p-0.5 text-center truncate font-medium">
                        {gif.name}
                      </div>
                    </div>
                  ))}
                  {PRESET_GIFS.filter(g => g.name.toLowerCase().includes(gifSearchQuery.toLowerCase())).length === 0 && (
                    <p className="text-[10px] text-slate-400 col-span-2 text-center py-4">No matching GIFs found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Encryption Fingerprint Verification Code Modal */}
      {showEncryptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 text-center">
            <button onClick={() => setShowEncryptionModal(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full inline-block">
              <Shield className="h-8 w-8 animate-pulse" />
            </div>
            <h3 className="font-bold text-base text-slate-850 dark:text-slate-200">Verify security code</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              To verify that messages with {activeContact.name} are end-to-end encrypted, compare these numbers with their device.
            </p>
            {/* WhatsApp security digits grid */}
            <div className="grid grid-cols-4 gap-3 py-4 font-mono text-[11px] font-black text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border">
              {['23491', '08945', '71295', '03429', '89104', '51295', '03429', '71829', '09184', '51295', '03429', '71295'].map((num, idx) => (
                <span key={idx} className="tracking-widest">{num}</span>
              ))}
            </div>
            <button
              onClick={() => setShowEncryptionModal(false)}
              className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md"
            >
              Close Verification
            </button>
          </div>
        </div>
      )}

      {/* Disappearing Messages Modal */}
      {showDisappearingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 text-left">
            <button onClick={() => setShowDisappearingModal(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-bold text-base text-slate-850 dark:text-slate-200">Disappearing messages</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              For more privacy and storage, all new messages will disappear from this chat for everyone after the selected duration.
            </p>
            <div className="space-y-2 pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              {[
                { label: '24 Hours', value: '24h' },
                { label: '7 Days', value: '7d' },
                { label: '90 Days', value: '90d' },
                { label: 'Off', value: 'off' }
              ].map((opt) => (
                <label key={opt.value} className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="disappearing"
                    checked={disappearingDuration === opt.value}
                    onChange={() => {
                      setDisappearingDuration(opt.value);
                      setShowDisappearingModal(false);
                      toast.success(`Disappearing messages set to ${opt.label}.`);
                    }}
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
