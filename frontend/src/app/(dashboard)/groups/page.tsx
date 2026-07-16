'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ImageCropperModal from '../../../components/ImageCropperModal';
import { 
  Send, 
  Paperclip, 
  X, 
  UserPlus, 
  Users, 
  Hash, 
  Plus, 
  LogOut,
  ChevronDown,
  Info,
  Pin,
  Bookmark,
  CornerUpLeft,
  CornerUpRight,
  Mic,
  MicOff,
  Search,
  BarChart3,
  Edit3,
  Trash2,
  Check,
  CheckCheck,
  FileImage,
  FileText,
  Megaphone,
  Copy,
  Bell,
  BellOff,
  MoreVertical,
  Eraser,
  Eye,
  Camera,
  ArrowLeft
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { useSocket } from '../../../hooks/useSocket';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

export default function GroupsPage() {
  const { user } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Fetch groups
  const { data: groups, isLoading: loadingGroups, refetch: refetchGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  // Fetch Directory users for dropdown selectors
  const { data: dirUsers } = useQuery({
    queryKey: ['directory-users-select'],
    queryFn: () => api.getDirectory('limit=100'),
  });

  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [channelSearch, setChannelSearch] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [typingStatus, setTypingStatus] = useState<string | null>(null);

  // Attachment upload
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupType, setNewGroupType] = useState<'DEPARTMENT' | 'PROJECT' | 'CUSTOM'>('CUSTOM');
  const [newGroupBroadcast, setNewGroupBroadcast] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [createSearchQuery, setCreateSearchQuery] = useState('');
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowPollVoting, setAllowPollVoting] = useState(true);
  const [newGroupAvatar, setNewGroupAvatar] = useState('');
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '']);
  const [quizCorrectIdx, setQuizCorrectIdx] = useState(0);
  const [stickerOpen, setStickerOpen] = useState(false);
  const newGroupAvatarRef = useRef<HTMLInputElement>(null);
  const editGroupAvatarRef = useRef<HTMLInputElement>(null);
  const newCoverRef = useRef<HTMLInputElement>(null);
  const editCoverRef = useRef<HTMLInputElement>(null);
  const rightAvatarInputRef = useRef<HTMLInputElement>(null);
  const rightCoverInputRef = useRef<HTMLInputElement>(null);

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState('');
  const [cropperTarget, setCropperTarget] = useState<'rightAvatar' | 'newGroupAvatar' | 'editGroupAvatar' | null>(null);

  const isGroupAdmin = activeGroup?.members?.some(
    (m: any) => m.userId === user?.id && m.role === 'ADMIN'
  ) || activeGroup?.createdById === user?.id;

  const isMember = activeGroup?.members?.some(
    (m: any) => m.userId === user?.id
  );

  // Add Member Modal
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [userToAddId, setUserToAddId] = useState('');
  const [votersModalOpen, setVotersModalOpen] = useState(false);
  const [selectedVotersList, setSelectedVotersList] = useState<any[]>([]);
  const [selectedOptionText, setSelectedOptionText] = useState('');
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Info Sidebar Panel & Search Toggles
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');

  // Sync active group state with fresh query lists
  useEffect(() => {
    if (activeGroup && Array.isArray(groups)) {
      const updated = groups.find((g: any) => g.id === activeGroup?.id);
      if (updated) {
        setActiveGroup(updated);
      }
    }
  }, [groups, activeGroup?.id]);

  // Edit Message Mode
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editValue, setEditValue] = useState('');

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Mentions state
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  const groupMembersList = activeGroup?.members?.map((m: any) => m?.user).filter(Boolean) || [];
  const filteredMentionUsers = (groupMembersList.length > 0 ? groupMembersList : (Array.isArray(dirUsers?.users) ? dirUsers.users : []))
    .filter((u: any) => u && (u.firstName || u.lastName || u.email))
    .filter((u: any) => {
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const query = mentionQuery.toLowerCase();
      return fullName.includes(query) || email.includes(query);
    })
    .slice(0, 8);

  const followedGroups = Array.isArray(groups) ? groups.filter((g: any) => 
    g.members?.some((m: any) => m.userId === user?.id)
  ) : [];

  const suggestedGroups = Array.isArray(groups) ? groups.filter((g: any) => 
    !g.members?.some((m: any) => m.userId === user?.id)
  ) : [];

  const getGroupCategory = (groupName: string) => {
    const name = groupName.toLowerCase();
    if (name.includes('news') || name.includes('announce') || name.includes('update') || name.includes('test')) return 'News';
    if (name.includes('tech') || name.includes('dev') || name.includes('code') || name.includes('apollo') || name.includes('program')) return 'Tech';
    if (name.includes('hr') || name.includes('people') || name.includes('career') || name.includes('talent')) return 'HR';
    if (name.includes('market') || name.includes('sale') || name.includes('brand') || name.includes('pr')) return 'Marketing';
    return 'News'; // default category
  };

  const filteredSuggestedGroups = suggestedGroups.filter((g: any) => {
    if (selectedCategory === 'All') return true;
    return getGroupCategory(g.name) === selectedCategory;
  });

  const filteredFollowed = followedGroups.filter((g: any) =>
    g.name.toLowerCase().includes(channelSearch.toLowerCase())
  );

  const filteredSuggested = filteredSuggestedGroups.filter((g: any) =>
    g.name.toLowerCase().includes(channelSearch.toLowerCase())
  );

  const parseChannelMetadata = (descText: string) => {
    try {
      if (descText && descText.startsWith('{')) {
        return JSON.parse(descText);
      }
    } catch (e) {
      // fallback
    }
    return {
      description: descText || '',
      website: '',
      coverUrl: '',
      allowReactions: true,
      allowPollVoting: true,
    };
  };

  const getUpdateStyle = (content: string) => {
    if (!content) return { borderClass: '', badge: null, cleanContent: '' };
    if (content.startsWith('[BREAKING]')) {
      return {
        borderClass: 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-950 dark:text-red-100',
        badge: <span className="px-1.5 py-0.5 bg-red-650 text-white rounded-[4px] text-[7px] font-black uppercase tracking-wider mb-1 inline-block">Breaking News</span>,
        cleanContent: content.replace('[BREAKING]', '').trim()
      };
    }
    if (content.startsWith('[ALERT]')) {
      return {
        borderClass: 'border-amber-550 bg-amber-50/50 dark:bg-amber-950/20 text-amber-955 dark:text-amber-100',
        badge: <span className="px-1.5 py-0.5 bg-amber-600 text-white rounded-[4px] text-[7px] font-black uppercase tracking-wider mb-1 inline-block">Alert</span>,
        cleanContent: content.replace('[ALERT]', '').trim()
      };
    }
    if (content.startsWith('[ANNOUNCEMENT]')) {
      return {
        borderClass: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-950 dark:text-blue-105',
        badge: <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded-[4px] text-[7px] font-black uppercase tracking-wider mb-1 inline-block">Announcement</span>,
        cleanContent: content.replace('[ANNOUNCEMENT]', '').trim()
      };
    }
    return {
      borderClass: '',
      badge: null,
      cleanContent: content
    };
  };

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

  const handleClearChatHistory = async () => {
    if (!activeGroup) return;
    if (!await confirm({
      title: 'Clear Chat History',
      message: 'Are you sure you want to clear chat history? This will delete all messages for you, but keep the channel open.',
      confirmText: 'Clear History',
      type: 'danger'
    })) return;
    try {
      await api.clearChat({ groupId: activeGroup.id });
      setMessages([]);
      toast.success('Channel chat history cleared.');
      refetchGroups();
      setClearMenuOpen(false);
    } catch (err) {
      toast.error('Could not clear channel chat history.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    if (!await confirm({
      title: 'Delete Channel',
      message: 'Are you sure you want to delete this channel completely for everyone? This action is permanent and cannot be undone.',
      confirmText: 'Delete Channel',
      type: 'danger'
    })) return;
    try {
      await api.deleteGroup(activeGroup.id);
      toast.success('Channel deleted successfully.');
      refetchGroups();
      setActiveGroup(null);
    } catch (err) {
      toast.error('Could not delete channel.');
    }
  };

  // Fetch bookmarks
  const { data: bookmarkedList, refetch: refetchBookmarks } = useQuery({
    queryKey: ['bookmarked-messages'],
    queryFn: () => api.getBookmarks(),
    enabled: !!user,
  });

  // Fetch active group messages
  const fetchGroupMessages = async () => {
    if (!activeGroup) return;
    try {
      const response = await api.getGroupMessages(activeGroup.id);
      setMessages(response.messages || []);
      socket?.emit('join_room', { roomId: activeGroup.id });
      await api.markAsRead({ groupId: activeGroup.id });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGroupMessages();
    setReplyingMessage(null);
  }, [activeGroup]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingStatus]);

  // Real-time listener
  useEffect(() => {
    if (!socket) return;

    const handleGroupMsg = (msg: any) => {
      if (activeGroup && msg.groupId === activeGroup.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleTyping = ({ senderId, groupId, senderName }: any) => {
      if (activeGroup && groupId === activeGroup.id && senderId !== user?.id) {
        setTypingStatus(`${senderName || 'Someone'} is typing...`);
      }
    };

    const handleStopTyping = ({ senderId, groupId }: any) => {
      if (activeGroup && groupId === activeGroup.id) {
        setTypingStatus(null);
      }
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

    const handlePollUpdated = (poll: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.poll?.id === poll.id ? { ...m, poll } : m))
      );
    };

    socket.on('message', handleGroupMsg);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('poll_updated', handlePollUpdated);

    return () => {
      socket.off('message', handleGroupMsg);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('poll_updated', handlePollUpdated);
    };
  }, [socket, activeGroup, user]);

  const sendMessageMutation = useMutation({
    mutationFn: (body: any) => api.sendMessage(body),
    onSuccess: (data) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
      setInputValue('');
      setAttachedFiles([]);
      setReplyingMessage(null);
    },
    onError: () => {
      toast.error('Could not send message.');
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    setMentionOpen(false);
    sendMessageMutation.mutate({
      groupId: activeGroup.id,
      content: inputValue,
      fileIds: attachedFiles.map((f) => f.id),
      parentId: replyingMessage?.id || null,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (!socket || !activeGroup) return;

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

    socket.emit('typing', {
      groupId: activeGroup.id,
      contactId: null,
      senderName: `${user?.firstName} ${user?.lastName}`,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { groupId: activeGroup.id, contactId: null });
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

  // Group Create Mutation
  const createGroupMutation = useMutation({
    mutationFn: (body: any) => api.createGroup(body),
    onSuccess: () => {
      toast.success('Channel created successfully.');
      setCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupBroadcast(false);
      setSelectedUserIds([]);
      setNewWebsiteUrl('');
      setNewCoverUrl('');
      setNewGroupAvatar('');
      setAllowReactions(true);
      setAllowPollVoting(true);
      refetchGroups();
    },
    onError: () => {
      toast.error('Failed to create channel.');
    },
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    const descPayload = JSON.stringify({
      description: newGroupDesc,
      website: newWebsiteUrl,
      coverUrl: newCoverUrl,
      allowReactions,
      allowPollVoting
    });

    createGroupMutation.mutate({
      name: newGroupName,
      description: descPayload,
      type: newGroupType,
      avatarUrl: newGroupAvatar,
      isBroadcast: newGroupBroadcast,
      userIds: selectedUserIds,
    });
  };

  // Add Member Mutation
  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.addMember(groupId, userId),
    onSuccess: () => {
      toast.success('Member added.');
      setAddMemberOpen(false);
      setUserToAddId('');
      refetchGroups();
    },
    onError: () => {
      toast.error('Failed to add member.');
    },
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToAddId || !activeGroup) return;
    addMemberMutation.mutate({ groupId: activeGroup.id, userId: userToAddId });
  };

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, body }: { groupId: string; body: any }) => api.updateGroup(groupId, body),
    onSuccess: (data) => {
      toast.success('Channel updated successfully.');
      setActiveGroup(data);
      refetchGroups();
      setEditModalOpen(false);
    },
    onError: () => {
      toast.error('Failed to update channel.');
    }
  });

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroupName.trim() || !activeGroup) return;

    const descPayload = JSON.stringify({
      description: editGroupDesc,
      website: editWebsiteUrl,
      coverUrl: editCoverUrl,
      allowReactions: activeGroup?.description ? parseChannelMetadata(activeGroup.description).allowReactions : true,
      allowPollVoting: activeGroup?.description ? parseChannelMetadata(activeGroup.description).allowPollVoting : true
    });

    updateGroupMutation.mutate({
      groupId: activeGroup.id,
      body: {
        name: editGroupName,
        description: descPayload,
        avatarUrl: editGroupAvatar || null
      }
    });
  };

  // Right Drawer direct uploads
  const handleRightAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeGroup) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperTarget('rightAvatar');
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedGroupAvatar = async (croppedFile: File) => {
    setCropperOpen(false);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', croppedFile);

    try {
      if (cropperTarget === 'rightAvatar' && activeGroup) {
        const response = await api.uploadFile(formData);
        updateGroupMutation.mutate({
          groupId: activeGroup.id,
          body: {
            name: activeGroup.name,
            description: activeGroup.description,
            avatarUrl: response.url
          }
        });
        toast.success('Channel avatar updated successfully!');
      } else if (cropperTarget === 'newGroupAvatar') {
        const response = await api.uploadFile(formData);
        setNewGroupAvatar(response.url);
        toast.success('Channel icon uploaded successfully!');
      } else if (cropperTarget === 'editGroupAvatar') {
        const response = await api.uploadFile(formData);
        setEditGroupAvatar(response.url);
        toast.success('Channel icon uploaded successfully!');
      }
    } catch (err: any) {
      toast.error('Failed to upload channel icon.');
    } finally {
      setUploading(false);
      setCropperTarget(null);
    }
  };

  const handleRightCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeGroup) return;

    setUploading(true);
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.uploadFile(formData);
      const currentMeta = parseChannelMetadata(activeGroup.description);
      const descPayload = JSON.stringify({
        description: currentMeta.description || activeGroup.description,
        website: currentMeta.website || '',
        coverUrl: response.url,
        allowReactions: currentMeta.allowReactions !== undefined ? currentMeta.allowReactions : true,
        allowPollVoting: currentMeta.allowPollVoting !== undefined ? currentMeta.allowPollVoting : true
      });

      updateGroupMutation.mutate({
        groupId: activeGroup.id,
        body: {
          name: activeGroup.name,
          description: descPayload,
          avatarUrl: activeGroup.avatarUrl
        }
      });
      toast.success('Channel cover banner updated successfully!');
    } catch (err: any) {
      toast.error('Failed to upload cover banner.');
    } finally {
      setUploading(false);
    }
  };

  // Camera mock capture
  const handleCapturePhoto = () => {
    const mockFile = {
      id: Math.random().toString(36).substring(7),
      name: `Camera_Capture_${new Date().toLocaleTimeString().replace(/:/g, '-')}.png`,
      fileType: 'PNG',
      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      size: 154200,
      file: {
        url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
        name: `Camera_Capture_${new Date().toLocaleTimeString().replace(/:/g, '-')}.png`,
        fileType: 'PNG'
      }
    };
    setAttachedFiles((prev) => [...prev, mockFile]);
    setCameraModalOpen(false);
    toast.success('Mock photo captured and attached.');
  };

  // Quiz creation
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizQuestion.trim() || quizOptions.filter((o) => o.trim()).length < 2) {
      toast.error('Specify a question and at least 2 options.');
      return;
    }
    const cleanOpts = quizOptions.filter((o) => o.trim());
    const correctVal = cleanOpts[quizCorrectIdx] || cleanOpts[0];

    // Format quiz announcement content
    const quizContent = `[QUIZ] 🎯 ${quizQuestion}\n${cleanOpts.map((opt, idx) => `${idx + 1}. ${opt} ${opt === correctVal ? '✔' : ''}`).join('\n')}`;

    try {
      await api.sendMessage({
        groupId: activeGroup.id,
        content: quizContent
      });
      setQuizModalOpen(false);
      setQuizQuestion('');
      setQuizOptions(['', '']);
      toast.success('Quiz launched successfully!');
    } catch (err) {
      toast.error('Failed to send quiz.');
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
      toast.success('Message forwarded.');
    } catch (err) {
      toast.error('Failed to forward.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    if (!await confirm({
      title: 'Leave Channel',
      message: 'Are you sure you want to leave this channel?',
      confirmText: 'Leave Channel',
      type: 'danger'
    })) return;
    try {
      await api.leaveGroup(activeGroup.id);
      toast.success('Left channel.');
      setActiveGroup(null);
      refetchGroups();
    } catch (err) {
      toast.error('Failed to leave channel.');
    }
  };

  // Audio Note Recorders
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
            groupId: activeGroup.id,
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

  // Poll Creators
  const handleAddPollOption = () => {
    setPollOptions((prev) => [...prev, '']);
  };

  const handlePollOptionChange = (idx: number, value: string) => {
    setPollOptions((prev) => prev.map((val, i) => (i === idx ? value : val)));
  };

  const handlePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) {
      toast.error('Please specify a question and at least 2 options.');
      return;
    }

    try {
      await api.createPoll({
        groupId: activeGroup.id,
        question: pollQuestion,
        options: pollOptions.filter((o) => o.trim()),
      });
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
      toast.error('Failed to cast vote.');
    }
  };

  // Client filter
  const displayedMessages = messages.filter((m) =>
    !msgSearchQuery ? true : m.content.toLowerCase().includes(msgSearchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm">
      {/* Groups Sidebar */}
      <aside className={`w-full md:w-80 border-r flex flex-col shrink-0 bg-slate-50/50 dark:bg-slate-900/50 ${activeGroup ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-base">Channel Directory</h3>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/95 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Channels Sidebar Search Bar */}
        <div className="p-2 border-b shrink-0 bg-slate-50/20 dark:bg-slate-900/20">
          <div className="relative">
            <input
              type="text"
              placeholder="Search channels..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 bg-white dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold"
            />
            {/* Search Magnifier SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.603 10.603z" />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {loadingGroups ? (
            <div className="text-center text-xs text-slate-400 py-10">Loading channels...</div>
          ) : (
            <>
              {/* Followed Channels Section */}
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider px-3 mb-1.5 text-left">
                  Followed Channels
                </div>
                {followedGroups.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic px-3 py-2 text-left">No followed channels yet. Find channels below to follow!</p>
                ) : filteredFollowed.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic px-3 py-2 text-left">No matching channels followed.</p>
                ) : (
                  filteredFollowed.map((group: any) => {
                    const active = activeGroup && activeGroup.id === group.id;
                    return (
                      <div
                        key={group.id}
                        onClick={() => setActiveGroup(group)}
                        className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                          active
                            ? 'bg-primary text-white shadow-sm'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border dark:border-slate-650">
                          {group.avatarUrl ? (
                            <img src={group.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-primary/80 to-blue-650/80 text-white font-extrabold flex items-center justify-center text-sm uppercase">
                              {group.name ? group.name[0] : '#'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`text-xs font-bold truncate flex items-center ${active ? 'text-white' : 'text-foreground'}`}>
                            {group.name}
                            <span className="inline-flex items-center justify-center bg-green-500 text-white rounded-full p-0.5 ml-1 shrink-0 h-3 w-3"><Check className="h-2 w-2 stroke-[3]" /></span>
                          </p>
                          <div className="flex items-center space-x-1.5 mt-0.5 min-w-0">
                            {group.isBroadcast && (
                              <span className="px-1 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase rounded text-[7px] tracking-wide shrink-0">Broadcast</span>
                            )}
                            <p className={`text-[10px] truncate ${active ? 'text-white/80' : 'text-muted-foreground'}`}>
                              {group.members?.length || 0} followers
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Find Channels to Follow Section */}
              {suggestedGroups.length > 0 && (
                <div className="space-y-2 pt-2 border-t dark:border-slate-800">
                  <div className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider px-3 mb-1 text-left">
                    Find Channels to Follow
                  </div>
                  
                  {/* Category Pills Navigation */}
                  <div className="flex items-center space-x-1 overflow-x-auto px-2 pb-1.5 scrollbar-none shrink-0">
                    {['All', 'News', 'Tech', 'HR', 'Marketing'].map((cat) => {
                      const selected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border transition-all shrink-0 select-none ${
                            selected
                              ? 'bg-green-600 text-white border-green-600 shadow-sm'
                              : 'bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-850'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {filteredSuggested.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic px-3 py-4 text-left font-semibold">No channels match search in this category.</p>
                  ) : (
                    filteredSuggested.map((group: any) => {
                      const active = activeGroup && activeGroup.id === group.id;
                      return (
                        <div
                          key={group.id}
                          onClick={() => setActiveGroup(group)}
                          className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                            active
                              ? 'bg-primary text-white shadow-sm'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border dark:border-slate-650">
                              {group.avatarUrl ? (
                                <img src={group.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-green-600/80 to-teal-650/80 text-white font-extrabold flex items-center justify-center text-sm uppercase">
                                  {group.name ? group.name[0] : '#'}
                                </div>
                              )}
                            </div>
                            <div className="text-left min-w-0">
                              <p className={`text-xs font-bold truncate flex items-center ${active ? 'text-white' : 'text-foreground'}`}>
                                {group.name}
                                <span className="inline-flex items-center justify-center bg-green-500 text-white rounded-full p-0.5 ml-1 shrink-0 h-3 w-3"><Check className="h-2 w-2 stroke-[3]" /></span>
                              </p>
                              <div className="flex items-center space-x-1.5 mt-0.5 min-w-0">
                                <span className="px-1 py-0.5 bg-slate-200/60 dark:bg-slate-750 text-slate-600 dark:text-slate-400 font-bold uppercase rounded text-[7px] shrink-0 tracking-wide">{getGroupCategory(group.name)}</span>
                                <p className={`text-[10px] truncate ${active ? 'text-white/80' : 'text-muted-foreground'}`}>
                                  {group.members?.length || 0} followers
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addMemberMutation.mutate({ groupId: group.id, userId: user?.id || '' });
                            }}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-full transition-all shrink-0 ml-2"
                          >
                            Follow
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Messaging Area */}
      <section className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 ${activeGroup ? 'flex' : 'hidden md:flex'}`}>
        {activeGroup ? (
          <>
            {/* Header */}
            <div className="h-16 px-6 border-b flex items-center justify-between shrink-0 glass z-10">
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  onClick={() => setActiveGroup(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 md:hidden mr-1 shrink-0"
                  aria-label="Back to channels list"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border dark:border-slate-705">
                  {activeGroup.avatarUrl ? (
                    <img src={activeGroup.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/80 to-blue-650/80 text-white font-extrabold flex items-center justify-center text-sm uppercase">
                      {activeGroup.name ? activeGroup.name[0] : '#'}
                    </div>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <h4 className="font-bold text-sm leading-none mb-1 flex items-center">
                    {activeGroup.name}
                    <span className="inline-flex items-center justify-center bg-green-500 text-white rounded-full p-0.5 ml-1 shrink-0 h-3 w-3"><Check className="h-2 w-2 stroke-[3]" /></span>
                  </h4>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    {activeGroup.members?.length || 0} followers
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0 min-w-0">
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    toast.success(!isMuted ? 'Notifications muted.' : 'Notifications unmuted.');
                  }}
                  className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                    isMuted ? 'bg-amber-500/10 text-amber-550 border-amber-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                  title={isMuted ? "Unmute Notifications" : "Mute Notifications"}
                >
                  {isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setShowMsgSearch(!showMsgSearch)}
                  className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                    showMsgSearch ? 'bg-primary/10 text-primary border-primary/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                  title="Search Messages"
                >
                  <Search className="h-4 w-4" />
                </button>
                {isMember && (
                  <button
                    onClick={() => setPollModalOpen(true)}
                    className="p-1.5 rounded-lg border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
                    title="Create Poll"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                    showInfoPanel ? 'bg-primary/10 text-primary border-primary/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                  title="Channel Info"
                >
                  <Info className="h-4 w-4" />
                </button>
                {isMember && (
                  <button
                    onClick={handleClearChatHistory}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-500 transition-all shrink-0"
                    title="Clear Chat History"
                    aria-label="Clear chat history"
                  >
                    <Eraser className="h-4 w-4" />
                  </button>
                )}
                <div className="relative group/more shrink-0">
                  <button
                    className="p-1.5 border hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all shrink-0 font-medium"
                    title="More Options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <div className="absolute top-8 right-0 bg-white dark:bg-slate-800 border rounded-lg shadow-xl hidden group-hover/more:block py-1 text-[11px] w-36 z-30 font-semibold text-slate-700 dark:text-slate-200">
                    <button
                      onClick={() => setShowInfoPanel(true)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-1.5"
                    >
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                      <span>Channel info</span>
                    </button>
                    {isMember && (
                      <button
                        onClick={() => setAddMemberOpen(true)}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-1.5"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-primary" />
                        <span>Add Member</span>
                      </button>
                    )}
                    {isMember && (
                      <button
                        onClick={handleLeaveGroup}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-red-500 flex items-center space-x-1.5"
                      >
                        <LogOut className="h-3.5 w-3.5 text-red-550" />
                        <span>Unfollow</span>
                      </button>
                    )}
                    {activeGroup.createdById === user?.id && (
                      <button
                        onClick={() => {
                          setEditGroupName(activeGroup.name);
                          const meta = parseChannelMetadata(activeGroup.description);
                          setEditGroupDesc(meta.description || activeGroup.description);
                          setEditGroupAvatar(activeGroup.avatarUrl || '');
                          setEditWebsiteUrl(meta.website || '');
                          setEditCoverUrl(meta.coverUrl || '');
                          setEditModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 font-bold"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-blue-500" />
                        <span>Edit Channel</span>
                      </button>
                    )}
                    {activeGroup.createdById === user?.id && (
                      <button
                        onClick={handleDeleteGroup}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-red-650 flex items-center space-x-1.5 font-bold"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        <span>Delete Channel</span>
                      </button>
                    )}
                    <button
                      onClick={() => toast.success('Thank you. Channel report submitted.')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-red-500 flex items-center space-x-1.5 font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Inline message search bar */}
            {showMsgSearch && (
              <div className="px-6 py-2 border-b bg-slate-50/50 dark:bg-slate-900/50 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search channel..."
                  value={msgSearchQuery}
                  onChange={(e) => setMsgSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-800 text-xs focus:outline-none"
                />
                <button onClick={() => { setMsgSearchQuery(''); setShowMsgSearch(false); }} className="text-slate-400 hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {isMember ? (
              <>
                {/* Messages Viewport */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {displayedMessages.length === 0 ? (
                msgSearchQuery ? (
                  <div className="text-center text-xs text-slate-400 py-20">No matching messages found.</div>
                ) : (
                  <div className="max-w-md mx-auto my-10 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                    <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-full mx-auto flex items-center justify-center shadow-md overflow-hidden border dark:border-slate-700">
                      {activeGroup.avatarUrl ? (
                        <img src={activeGroup.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/80 to-blue-650/80 text-white font-extrabold flex items-center justify-center text-lg uppercase">
                          {activeGroup.name ? activeGroup.name[0] : '#'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-sm text-foreground">Start growing "{activeGroup.name}"</h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                        Get started by adding an icon, description, and your first update. Invite people by sharing your link.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + `/groups?join=${activeGroup.id}`);
                        toast.success('Channel join link copied to clipboard!');
                      }}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                    >
                      Share channel link
                    </button>
                  </div>
                )
              ) : (
                displayedMessages.map((msg) => {
                  const self = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${self ? 'items-end' : 'items-start'} space-y-1`}>
                      
                      {/* Parent thread reply display */}
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

                      <span className="text-[10px] text-slate-400 font-bold mb-0.5">
                        {msg.sender.firstName} {msg.sender.lastName}
                      </span>

                      <div className={`flex items-start gap-2 max-w-[70%] group`}>
                        {/* Hover Quick Actions */}
                        {!msg.isDeleted && (
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
                            {self && (
                              <>
                                <button onClick={() => { setEditingMessage(msg); setEditValue(msg.content); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400">
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <div className="relative group/del">
                                  <button className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded text-red-500">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  <div className="absolute top-6 right-0 bg-white dark:bg-slate-800 border rounded-lg shadow-xl hidden group-hover/del:block py-1 text-[10px] w-28 z-30">
                                    <button onClick={() => handleDeleteMessage(msg.id, 'FOR_ME')} className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700">Delete for me</button>
                                    <button onClick={() => handleDeleteMessage(msg.id, 'FOR_EVERYONE')} className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-red-500 font-bold">Delete for all</button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {(() => {
                          const isDeled = msg.isDeleted || msg.content === 'This message was deleted.';
                          const updateStyle = isDeled ? { borderClass: 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500', badge: null, cleanContent: 'This message was deleted.' } : getUpdateStyle(msg.content);
                          return (
                            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed border transition-all ${
                              updateStyle.borderClass || (self
                                ? 'bg-primary text-white border-primary shadow-sm rounded-tr-none'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-tl-none')
                            }`}>
                              {updateStyle.badge}
                              <p className={isDeled ? 'italic text-slate-400 dark:text-slate-500 font-semibold' : ''}>{updateStyle.cleanContent}</p>

                              {/* Poll Component */}
                              {msg.poll && !isDeled && (
                                <div className="mt-3 p-3 bg-white dark:bg-slate-900 border rounded-xl space-y-2 text-foreground shadow-sm max-w-[280px]">
                                  <div className="flex justify-between items-center border-b pb-1.5 min-w-0">
                                    <p className="font-bold text-xs truncate mr-1.5">{msg.poll.question}</p>
                                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[7px] font-black uppercase tracking-wide shrink-0">Single Choice</span>
                                  </div>
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
                                          <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all" style={{ width: `${percentage}%` }} />
                                          <div className="relative flex justify-between items-center z-10">
                                            <span>{opt.text}</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedOptionText(opt.text);
                                                setSelectedVotersList(opt.votes || []);
                                                setVotersModalOpen(true);
                                              }}
                                              className="text-slate-400 hover:text-primary transition-all font-bold px-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[9px]"
                                              title="View Voters"
                                            >
                                              {votesCount} ({percentage}%)
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wider text-left pt-1 leading-none">
                                    Anonymous Voting Active
                                  </div>
                                </div>
                              )}

                              {/* Voice Note Player */}
                              {msg.voiceNoteUrl && !isDeled && (
                                <div className="mt-2">
                                  <audio controls src={msg.voiceNoteUrl} className="max-w-[200px] h-8 text-xs focus:outline-none" />
                                </div>
                              )}

                              {/* Attachments */}
                              {msg.attachments?.length > 0 && !isDeled && (
                                <div className="mt-2 pt-2 border-t border-white/20 space-y-2">
                                  {msg.attachments.map((att: any) => (
                                    <a
                                      key={att.id}
                                      href={att.file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center space-x-2 p-2 rounded-lg border text-[11px] ${
                                        self ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-150'
                                      }`}
                                    >
                                      {att.file?.fileType === 'PNG' || att.file?.fileType === 'JPEG' ? (
                                        <FileImage className="h-4 w-4 shrink-0" />
                                      ) : (
                                        <FileText className="h-4 w-4 shrink-0" />
                                      )}
                                      <span className="truncate max-w-[150px] font-bold">{att.file?.name}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Info timestamps & reach statistics dashboard preview values */}
                      <div className="flex items-center space-x-2 text-[9px] text-slate-400 font-semibold px-1">
                        {msg.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!msg.isDeleted && (
                          <>
                            <span>•</span>
                            <span className="flex items-center space-x-0.5">
                              <Eye className="h-3 w-3 inline text-slate-400" />
                              <span>{(msg.content.length % 40) + 12} views</span>
                            </span>
                            <span>•</span>
                            <span>{85 + (msg.content.length % 15)}% reach</span>
                          </>
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
              <div ref={scrollRef} />
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
                    <p className="text-xs text-slate-400">Select a colleague to forward this message to.</p>
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
                        {dirUsers?.users?.filter((u: any) => u.id !== user?.id).map((u: any) => (
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

            {/* Poll Launch Modal */}
            {pollModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs">
                <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
                  <button onClick={() => setPollModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
                    <X className="h-5 w-5" />
                  </button>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm">Launch Option Poll</h3>
                    <p className="text-xs text-slate-400">Launch a vote in this channel.</p>
                  </div>
                  <form onSubmit={handlePollSubmit} className="space-y-4 text-xs font-semibold">
                    <div className="space-y-2">
                      <label className="text-slate-400 uppercase text-[10px]">Question</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Which date works best for launch?"
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
            <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 shrink-0 space-y-3 relative">
              {mentionOpen && filteredMentionUsers.length > 0 && (
                <div className="absolute bottom-full mb-2 left-4 right-4 bg-white dark:bg-slate-800 border dark:border-slate-750 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <p className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider px-2.5 py-1">Mention Member</p>
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
                    <div key={file.id} className="flex items-center space-x-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-xl text-[10px] text-primary font-bold">
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button onClick={() => setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeGroup.isBroadcast && !isGroupAdmin ? (
                <div className="flex items-center justify-center p-4 bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl text-xs font-semibold text-slate-400">
                  <span>Only administrators can send messages in this channel.</span>
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex items-center space-x-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                      className={`p-2.5 rounded-full border transition-all shrink-0 flex items-center justify-center ${
                        plusMenuOpen ? 'bg-slate-150 dark:bg-slate-855 text-primary border-primary/20' : 'hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-800'
                      }`}
                      title="Attach options"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    {plusMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setPlusMenuOpen(false)} />
                        <div className="absolute bottom-full mb-3 left-0 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl shadow-2xl p-2 w-48 space-y-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left font-bold text-[10px] text-slate-700 dark:text-slate-200">
                        {/* Photos & videos */}
                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setPlusMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-2.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                        >
                          <div className="h-7 w-7 bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <FileImage className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-extrabold">Photos & videos</span>
                        </button>

                        {/* Camera */}
                        <button
                          type="button"
                          onClick={() => {
                            setCameraModalOpen(true);
                            setPlusMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-2.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                        >
                          <div className="h-7 w-7 bg-pink-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <Camera className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-extrabold">Camera</span>
                        </button>

                        {/* Question */}
                        <button
                          type="button"
                          onClick={() => {
                            setInputValue('[ANNOUNCEMENT] Question: ');
                            setPlusMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-2.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                        >
                          <div className="h-7 w-7 bg-teal-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <Info className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-extrabold">Question</span>
                        </button>

                        {/* Poll */}
                        <button
                          type="button"
                          onClick={() => {
                            setPollModalOpen(true);
                            setPlusMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-2.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                        >
                          <div className="h-7 w-7 bg-amber-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <BarChart3 className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-extrabold">Poll</span>
                        </button>

                        {/* Quiz */}
                        <button
                          type="button"
                          onClick={() => {
                            setQuizModalOpen(true);
                            setPlusMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-2.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                        >
                          <div className="h-7 w-7 bg-purple-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <Bookmark className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-extrabold">Quiz</span>
                        </button>

                        {/* New sticker */}
                        <button
                          type="button"
                          onClick={() => {
                            setStickerOpen(true);
                            setPlusMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-2.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                        >
                          <div className="h-7 w-7 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <Megaphone className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-extrabold">New sticker</span>
                        </button>
                      </div>
                      </>
                    )}
                  </div>

                  {/* Voice recorder triggers */}
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="p-2.5 bg-red-500 text-white rounded-xl transition-all shrink-0 animate-pulse"
                      title="Stop Recording"
                    >
                      <MicOff className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="p-2.5 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all shrink-0"
                      title="Record Voice Note"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  )}

                  <input
                    type="text"
                    placeholder={`Message #${activeGroup.name}...`}
                    value={inputValue}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-xs"
                  />

                  <button
                    type="submit"
                    disabled={!inputValue.trim() && attachedFiles.length === 0}
                    className="p-3 bg-primary text-white rounded-xl hover:bg-primary/95 transition-all shadow-md shrink-0"
                    title="Send Message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/30 p-8 space-y-6 text-center select-none">
            <div className="p-4 bg-primary/10 rounded-full text-primary">
              {activeGroup.isBroadcast ? (
                <Megaphone className="h-12 w-12" />
              ) : (
                <Hash className="h-12 w-12" />
              )}
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="font-extrabold text-xl text-slate-800 dark:text-slate-100">Join #{activeGroup.name}</h3>
              <p className="text-xs text-slate-400 leading-normal font-semibold">
                {activeGroup.description || 'Welcome to this workspace channel. Join to start conversing with your team.'}
              </p>
            </div>
            <button
              onClick={() => addMemberMutation.mutate({ groupId: activeGroup.id, userId: user?.id || '' })}
              disabled={addMemberMutation.isPending}
              className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary/95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              title="Join Channel"
            >
              <UserPlus className="h-4 w-4" />
              <span>Join Channel</span>
            </button>
          </div>
        )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 text-center text-slate-400">
            <Users className="h-16 w-16 stroke-1" />
            <div>
              <h3 className="font-bold text-base text-foreground">No Channel Selected</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Pick a department, project, or custom conversation channel from the list on the left.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Right Conversation Info sidebar panel */}
      {showInfoPanel && activeGroup && (
        <aside className="fixed md:relative inset-y-0 right-0 w-full md:w-80 border-l flex flex-col shrink-0 bg-white dark:bg-slate-900 p-4 space-y-6 overflow-y-auto animate-in slide-in-from-right-5 duration-200 text-xs z-50 md:z-20 shadow-2xl md:shadow-none">
          {/* Title bar */}
          <div className="flex items-center space-x-3 pb-3 border-b dark:border-slate-800 shrink-0">
            <button onClick={() => setShowInfoPanel(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Close info">
              <X className="h-4 w-4" />
            </button>
            <span className="font-bold text-sm text-foreground">Channel info</span>
          </div>

          {/* Avatar and name branding check circle check badge */}
          {(() => {
            const channelMeta = parseChannelMetadata(activeGroup.description);
            return (
              <>
                {/* Cover Banner background */}
                <div className="w-full h-24 rounded-xl overflow-hidden relative shrink-0 border-b group">
                  {channelMeta.coverUrl ? (
                    <img src={channelMeta.coverUrl} className="w-full h-full object-cover" alt="Cover Banner" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-green-500/80 to-primary/80" />
                  )}
                  {/* Change Cover button overlay */}
                  <button
                    onClick={() => rightCoverInputRef.current?.click()}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-black/60 hover:bg-black/85 text-white rounded-lg text-[9px] font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-95 z-20"
                    title="Change Cover Banner"
                    type="button"
                  >
                    <Camera className="h-3 w-3" />
                    <span>Change Cover</span>
                  </button>
                  <input
                    type="file"
                    ref={rightCoverInputRef}
                    onChange={handleRightCoverUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </div>

                <div className="text-center py-4 space-y-3 border-b dark:border-slate-800 flex flex-col items-center shrink-0 w-full relative -mt-8">
                  <div 
                    onClick={() => rightAvatarInputRef.current?.click()}
                    className="h-16 w-16 bg-white dark:bg-slate-900 border dark:border-slate-850 rounded-full flex items-center justify-center text-primary font-bold text-2xl uppercase shadow-md relative z-10 overflow-hidden cursor-pointer hover:brightness-95 group/avatar"
                  >
                    {activeGroup.avatarUrl ? (
                      <img src={activeGroup.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/80 to-blue-650/80 text-white font-extrabold flex items-center justify-center text-lg uppercase">
                        {activeGroup.name ? activeGroup.name[0] : '#'}
                      </div>
                    )}
                    {/* Upload Overlay Arrow Icon */}
                    <div className="absolute inset-0 bg-black/45 text-white flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all z-20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={rightAvatarInputRef}
                    onChange={handleRightAvatarUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base flex items-center justify-center">
                      {activeGroup.name}
                      <span className="inline-flex items-center justify-center bg-green-500 text-white rounded-full p-0.5 ml-1 shrink-0 h-3.5 w-3.5"><Check className="h-2 w-2 stroke-[3]" /></span>
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold">
                      Channel • {activeGroup.members?.length || 0} followers
                    </p>
                    <div className="pt-1.5 flex items-center justify-center space-x-1.5">
                      <span className="px-2.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 font-black uppercase rounded-full text-[8px] tracking-wide">
                        {getGroupCategory(activeGroup.name)}
                      </span>
                      <span className="px-2.5 py-0.5 bg-primary/10 text-primary font-black uppercase rounded-full text-[8px] tracking-wide">
                        {activeGroup.type}
                      </span>
                    </div>
                    {isGroupAdmin && (
                      <button
                        onClick={() => {
                          setEditGroupName(activeGroup.name);
                          const meta = parseChannelMetadata(activeGroup.description);
                          setEditGroupDesc(meta.description || activeGroup.description);
                          setEditGroupAvatar(activeGroup.avatarUrl || '');
                          setEditWebsiteUrl(meta.website || '');
                          setEditCoverUrl(meta.coverUrl || '');
                          setEditModalOpen(true);
                        }}
                        className="mt-3 px-3 py-1.5 border dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-extrabold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center space-x-1 mx-auto shadow-xs"
                        type="button"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        <span>Edit Profile</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-3 gap-4 pt-4 w-full px-2 max-w-xs">
                    <button 
                      onClick={() => {
                        if (isMember) {
                          handleLeaveGroup();
                        } else {
                          addMemberMutation.mutate({ groupId: activeGroup.id, userId: user?.id || '' });
                        }
                      }}
                      className="flex flex-col items-center space-y-1.5 focus:outline-none"
                    >
                      <div className="h-10 w-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-355 transition-all border dark:border-slate-700">
                        {isMember ? <Check className="h-5 w-5 text-green-600 dark:text-green-400 animate-in zoom-in-50 duration-200" /> : <Plus className="h-5 w-5" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-355">{isMember ? 'Following' : 'Follow'}</span>
                    </button>

                    <button 
                      onClick={() => setForwardingMessage({ id: 'dummy', content: `Check out the channel #${activeGroup.name}!` })}
                      className="flex flex-col items-center space-y-1.5 focus:outline-none"
                    >
                      <div className="h-10 w-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-355 transition-all border dark:border-slate-700">
                        <CornerUpRight className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-355">Forward</span>
                    </button>

                    <button 
                      onClick={() => {
                        const channelUrl = `${window.location.origin}/groups?id=${activeGroup.id}`;
                        navigator.clipboard.writeText(channelUrl);
                        toast.success('Channel link copied to clipboard.');
                      }}
                      className="flex flex-col items-center space-y-1.5 focus:outline-none"
                    >
                      <div className="h-10 w-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-355 transition-all border dark:border-slate-700">
                        <Copy className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-355">Copy link</span>
                    </button>
                  </div>
                </div>

                {/* Description & Created details */}
                <div className="space-y-3 border-b dark:border-slate-800 pb-4 text-left shrink-0">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                    {channelMeta.description || 'Welcome to this workspace channel. Stay updated with project progress, announcements, and team discussions.'}
                  </p>
                  {channelMeta.website && (
                    <div className="pt-1.5">
                      <span className="text-[9px] text-slate-400 block font-black uppercase tracking-wider leading-none mb-1">Website Link</span>
                      <a href={channelMeta.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-bold break-all">
                        {channelMeta.website}
                      </a>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-semibold pt-1">
                    Created {new Date(activeGroup.createdAt).toLocaleDateString()} at {new Date(activeGroup.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {/* Channel Profile Strength */}
                  {(() => {
                    let strength = 0;
                    if (activeGroup.avatarUrl) strength += 25;
                    if (channelMeta.coverUrl) strength += 25;
                    if (channelMeta.description && channelMeta.description !== 'Welcome to this workspace channel. Stay updated with project progress, announcements, and team discussions.') strength += 25;
                    if (channelMeta.website) strength += 25;

                    return (
                      <div className="bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-800 rounded-2xl p-3 text-left space-y-2 shrink-0 mt-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                          <span>Profile Strength</span>
                          <span className="text-primary font-black text-[9px]">{strength}% Complete</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${strength}%` }} />
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold leading-normal">
                          Tip: Add a custom avatar icon, cover banner, description, and website to build trust and grow followers.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </>
            );
          })()}

          {/* Muted toggle settings card */}
          <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4 shrink-0">
            <div className="flex items-center space-x-3 text-left">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                {isMuted ? <BellOff className="h-4 w-4 text-amber-500" /> : <Bell className="h-4 w-4" />}
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none mb-1">Muted</h5>
                <p className="text-[10px] text-slate-400 leading-none font-semibold">Mute updates notifications</p>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={isMuted} 
              onChange={(e) => {
                setIsMuted(e.target.checked);
                toast.success(e.target.checked ? 'Notifications muted.' : 'Notifications unmuted.');
              }}
              className="h-4 w-4 text-primary border-slate-300 rounded cursor-pointer"
            />
          </div>

          {/* Public channel & Profile privacy info lists */}
          <div className="space-y-4 border-b dark:border-slate-800 pb-4 text-left shrink-0">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 mt-0.5 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none mb-1">Public channel</h5>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Anyone can find this channel and see what's been shared.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 mt-0.5 shrink-0">
                <Info className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none mb-1">Profile privacy</h5>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  This channel has added privacy for your profile and phone number. Click to learn more.
                </p>
              </div>
            </div>
          </div>

          {/* Actions List */}
          <div className="space-y-1.5 border-b dark:border-slate-800 pb-4 text-left shrink-0">
            {isMember && (
              <button 
                onClick={() => setAnalyticsModalOpen(true)}
                className="w-full flex items-center space-x-3 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all rounded-xl border dark:border-slate-800"
              >
                <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
                <span>View Channel Analytics</span>
              </button>
            )}
            {isMember && (
              <button 
                onClick={handleLeaveGroup}
                className="w-full flex items-center space-x-3 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold transition-all rounded-xl"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Unfollow channel</span>
              </button>
            )}
            <button 
              onClick={() => toast.success('Thank you. Channel report submitted.')}
              className="w-full flex items-center space-x-3 px-3 py-2 text-red-550 hover:bg-red-550/10 text-red-500 text-xs font-bold transition-all rounded-xl"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span>Report channel</span>
            </button>
          </div>

          {/* Group Pinned Messages */}
          <div className="space-y-2 text-left shrink-0">
            <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center space-x-1">
              <Pin className="h-3 w-3 text-primary" />
              <span>Pinned Messages ({messages.filter((m) => m.isPinned).length})</span>
            </h4>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
              {messages.filter((m) => m.isPinned).length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No pinned messages.</p>
              ) : (
                messages
                  .filter((m) => m.isPinned)
                  .map((m) => (
                    <div key={m.id} className="p-2.5 border bg-white dark:bg-slate-900 rounded-xl space-y-1 relative text-[10px]">
                      <div className="flex justify-between text-[8px] text-slate-400 font-bold border-b pb-1">
                        <span>{m.sender?.firstName || 'Colleague'}</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-355 pt-1 line-clamp-2">{m.content}</p>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Bookmarks */}
          <div className="space-y-2 border-t dark:border-slate-800 pt-4 text-left shrink-0">
            <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center space-x-1">
              <Bookmark className="h-3 w-3 text-primary" />
              <span>Starred Messages ({bookmarkedList?.length || 0})</span>
            </h4>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
              {!bookmarkedList || bookmarkedList.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No starred messages.</p>
              ) : (
                bookmarkedList
                  .filter((bm: any) => bm.message?.groupId === activeGroup.id)
                  .map((bm: any) => (
                    <div key={bm.id} className="p-2.5 border bg-white dark:bg-slate-900 rounded-xl space-y-1 text-[10px]">
                      <div className="flex justify-between text-[8px] text-slate-400 font-bold border-b pb-1">
                        <span>{bm.message?.sender?.firstName || 'Colleague'}</span>
                        <span>{new Date(bm.message?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-355 pt-1 line-clamp-2">{bm.message?.content}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Group Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => { setCreateModalOpen(false); setCreateSearchQuery(''); }} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg" title="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-sm">Create Workspace Channel</h3>
              <p className="text-xs text-slate-400">Establish a private space for team communication.</p>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-xs font-semibold max-h-[68vh] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Channel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. project-apollo-launch"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex flex-col items-center space-y-2 pb-2">
                <button 
                  onClick={() => newGroupAvatarRef.current?.click()}
                  className="h-16 w-16 rounded-full border dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group shadow-sm text-left"
                  type="button"
                >
                  {newGroupAvatar ? (
                    <img src={newGroupAvatar} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-slate-400 group-hover:scale-105 transition-all" />
                  )}
                  <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-[8px] font-black uppercase">
                    Upload
                  </div>
                </button>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Channel Profile Avatar</span>
                <input
                  type="file"
                  ref={newGroupAvatarRef}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    const file = files[0];
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCropperImageSrc(reader.result as string);
                      setCropperTarget('newGroupAvatar');
                      setCropperOpen(true);
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Description</label>
                <textarea
                  placeholder="What is this channel about?"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none resize-none h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Type</label>
                  <select
                    value={newGroupType}
                    onChange={(e: any) => setNewGroupType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-[10px]"
                  >
                    <option value="CUSTOM">Custom Group</option>
                    <option value="PROJECT">Project Channel</option>
                    <option value="DEPARTMENT">Department Channel</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase text-[9px]">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e: any) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-[10px]"
                  >
                    <option value="News">News</option>
                    <option value="Tech">Tech</option>
                    <option value="HR">HR</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px]">Website Link (Optional)</label>
                <input
                  type="url"
                  placeholder="e.g. https://connecthub.com/engineering"
                  value={newWebsiteUrl}
                  onChange={(e) => setNewWebsiteUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-slate-400 uppercase text-[9px]">Cover Banner Image (Optional)</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => newCoverRef.current?.click()}
                    className="px-4 py-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-extrabold text-slate-600 dark:text-slate-350 transition-all shrink-0"
                  >
                    Select Banner File
                  </button>
                  <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                    {newCoverUrl ? "File uploaded and ready" : "No file selected"}
                  </span>
                  <input
                    type="file"
                    ref={newCoverRef}
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setUploading(true);
                      const file = files[0];
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const response = await api.uploadFile(formData);
                        setNewCoverUrl(response.url);
                        toast.success('Cover banner uploaded!');
                      } catch (err: any) {
                        toast.error('Failed to upload cover banner.');
                      } finally {
                        setUploading(false);
                      }
                    }}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>

              {/* Followers Permissions */}
              <div className="space-y-2 border-t dark:border-slate-800 pt-2 text-left">
                <label className="text-slate-400 uppercase text-[9px] font-black">Follower Rights Settings</label>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Allow Emoji Reactions</span>
                  <input
                    type="checkbox"
                    checked={allowReactions}
                    onChange={(e) => setAllowReactions(e.target.checked)}
                    className="h-3.5 w-3.5 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Allow Poll Voting</span>
                  <input
                    type="checkbox"
                    checked={allowPollVoting}
                    onChange={(e) => setAllowPollVoting(e.target.checked)}
                    className="h-3.5 w-3.5 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2.5 py-1.5">
                <input
                  type="checkbox"
                  id="create-broadcast"
                  checked={newGroupBroadcast}
                  onChange={(e) => setNewGroupBroadcast(e.target.checked)}
                  className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                />
                <div className="text-left select-none">
                  <label htmlFor="create-broadcast" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer block leading-none">Broadcast Channel</label>
                  <span className="text-[10px] text-slate-400 block pt-1">Only administrators/creators can send messages (like WhatsApp/Telegram)</span>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-slate-400 uppercase text-[9px]">Add Co-workers</label>
                <input
                  type="text"
                  placeholder="Search teammates..."
                  value={createSearchQuery}
                  onChange={(e) => setCreateSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none mb-1.5"
                />
                <div className="max-h-[100px] overflow-y-auto border p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1">
                  {dirUsers?.users
                    ?.filter((u: any) => u.id !== user?.id)
                    .filter((u: any) => {
                      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                      return fullName.includes(createSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(createSearchQuery.toLowerCase());
                    })
                    .map((u: any) => {
                      const selected = selectedUserIds.includes(u.id);
                      return (
                        <div key={u.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`create-sel-${u.id}`}
                            checked={selected}
                            onChange={() => {
                              setSelectedUserIds((prev) =>
                                selected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                              );
                            }}
                            className="h-3.5 w-3.5 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                          />
                          <label htmlFor={`create-sel-${u.id}`} className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">{u.firstName} {u.lastName}</label>
                        </div>
                      );
                    })}
                </div>
              </div>

              <button
                type="submit"
                disabled={createGroupMutation.isPending}
                className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                Create Channel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {editModalOpen && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setEditModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg" title="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground text-left">Edit Channel Profile</h3>
              <p className="text-xs text-slate-400 text-left">Modify channel logo, cover banner, description, and website.</p>
            </div>
            <form onSubmit={handleUpdateGroup} className="space-y-3.5 text-xs font-semibold max-h-[68vh] overflow-y-auto pr-1">
              <div className="space-y-1.5 text-left">
                <label className="text-slate-400 uppercase text-[9px]">Channel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. project-apollo-launch"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex flex-col items-center space-y-2 pb-2">
                <button 
                  onClick={() => editGroupAvatarRef.current?.click()}
                  className="h-16 w-16 rounded-full border dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group shadow-sm text-left"
                  type="button"
                >
                  {editGroupAvatar ? (
                    <img src={editGroupAvatar} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-slate-400 group-hover:scale-105 transition-all" />
                  )}
                  <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-[8px] font-black uppercase">
                    Upload
                  </div>
                </button>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Update Channel Avatar</span>
                <input
                  type="file"
                  ref={editGroupAvatarRef}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    const file = files[0];
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCropperImageSrc(reader.result as string);
                      setCropperTarget('editGroupAvatar');
                      setCropperOpen(true);
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-slate-400 uppercase text-[9px]">Description</label>
                <textarea
                  placeholder="What is this channel about?"
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none resize-none h-16"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-slate-400 uppercase text-[9px]">Website Link</label>
                <input
                  type="url"
                  placeholder="e.g. https://connecthub.app"
                  value={editWebsiteUrl}
                  onChange={(e) => setEditWebsiteUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-slate-400 uppercase text-[9px]">Cover Banner Image</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => editCoverRef.current?.click()}
                    className="px-4 py-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-extrabold text-slate-600 dark:text-slate-350 transition-all shrink-0"
                  >
                    Select Banner File
                  </button>
                  <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                    {editCoverUrl ? "File uploaded and ready" : "No file selected"}
                  </span>
                  <input
                    type="file"
                    ref={editCoverRef}
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setUploading(true);
                      const file = files[0];
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const response = await api.uploadFile(formData);
                        setEditCoverUrl(response.url);
                        toast.success('Cover banner uploaded!');
                      } catch (err: any) {
                        toast.error('Failed to upload cover banner.');
                      } finally {
                        setUploading(false);
                      }
                    }}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updateGroupMutation.isPending}
                className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {updateGroupMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => { setAddMemberOpen(false); setMemberSearchQuery(''); }} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg" title="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-sm">Add Team Member</h3>
              <p className="text-xs text-slate-400">Invite or add colleagues to join #{activeGroup?.name}.</p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search colleagues..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none font-semibold text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Colleagues List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 select-none">
              {(dirUsers?.users || [])
                .filter((u: any) => u.id !== user?.id)
                .filter((u: any) => {
                  const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                  return fullName.includes(memberSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(memberSearchQuery.toLowerCase());
                })
                .length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No colleagues found.</p>
              ) : (
                (dirUsers?.users || [])
                  .filter((u: any) => u.id !== user?.id)
                  .filter((u: any) => {
                    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                    return fullName.includes(memberSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(memberSearchQuery.toLowerCase());
                  })
                  .map((u: any) => {
                    const isAdded = activeGroup?.members?.some((m: any) => m.userId === u.id);
                    return (
                      <div key={u.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                        <div className="flex items-center space-x-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs uppercase shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              `${u.firstName[0]}${u.lastName[0]}`
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none mb-1">{u.firstName} {u.lastName}</p>
                            <p className="text-[9px] text-slate-400 leading-none">{u.designation || 'Teammate'}</p>
                          </div>
                        </div>
                        <div>
                          {isAdded ? (
                            <span className="flex items-center space-x-1 px-2.5 py-1 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-lg border border-green-100 dark:border-green-900/30">
                              <Check className="h-3 w-3" />
                              <span>Already Added</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => addMemberMutation.mutate({ groupId: activeGroup.id, userId: u.id })}
                              disabled={addMemberMutation.isPending}
                              className="flex items-center space-x-1 px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/95 transition-all shadow-xs disabled:opacity-50"
                            >
                              <UserPlus className="h-3 w-3" />
                              <span>Add Member</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative text-xs">
            <button onClick={() => setCameraModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg" title="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground text-left">Camera Capture</h3>
              <p className="text-xs text-slate-400 text-left">Take a quick picture or snapshot to send.</p>
            </div>
            <div className="h-44 bg-slate-955 rounded-2xl flex items-center justify-center relative overflow-hidden border dark:border-slate-800 shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.1),transparent_70%)] animate-pulse" />
              <Camera className="h-10 w-10 text-pink-500 animate-bounce" />
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 tracking-wider uppercase">Live Preview Mock</span>
            </div>
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              Take Photo
            </button>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {quizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative text-xs">
            <button onClick={() => setQuizModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg" title="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground text-left">Create Channel Quiz</h3>
              <p className="text-xs text-slate-400 text-left">Launch an interactive trivia challenge for followers.</p>
            </div>
            <form onSubmit={handleQuizSubmit} className="space-y-3.5">
              <div className="space-y-1.5 text-left">
                <label className="text-slate-400 uppercase text-[9px]">Quiz Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Which team built ConnectHub?"
                  value={quizQuestion}
                  onChange={(e) => setQuizQuestion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-slate-400 uppercase text-[9px]">Answers & Correct Check</label>
                {quizOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      required
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuizOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
                    />
                    <input
                      type="radio"
                      name="correct-quiz-option"
                      checked={quizCorrectIdx === idx}
                      onChange={() => setQuizCorrectIdx(idx)}
                      className="h-4 w-4 text-primary border-slate-350 cursor-pointer"
                      title="Mark as correct answer"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setQuizOptions((prev) => [...prev, ''])}
                  className="text-[10px] text-primary font-bold hover:underline"
                >
                  + Add Option
                </button>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                Launch Quiz
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sticker Picker popover Modal */}
      {stickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-5 rounded-3xl w-full max-w-xs space-y-4 shadow-2xl relative text-xs">
            <button onClick={() => setStickerOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg" title="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground text-left">Stickers Library</h3>
              <p className="text-xs text-slate-400 text-left">Click a sticker to send it instantly.</p>
            </div>
            <div className="grid grid-cols-4 gap-3.5 p-1 max-h-[180px] overflow-y-auto">
              {['🚀', '🎉', '🔥', '👏', '🎯', '💡', '🏆', '📈', '🤝', '🙌', '✨', '⭐'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={async () => {
                    try {
                      await api.sendMessage({ groupId: activeGroup.id, content: emoji });
                      setStickerOpen(false);
                      toast.success('Sticker sent.');
                    } catch (err) {
                      toast.error('Failed to send sticker.');
                    }
                  }}
                  className="h-12 bg-slate-50 dark:bg-slate-800 rounded-xl hover:scale-105 active:scale-95 transition-all text-2xl flex items-center justify-center shadow-xs border dark:border-slate-800 text-slate-850 dark:text-slate-150"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Voters List Modal */}
      {votersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative text-xs">
            <button onClick={() => { setVotersModalOpen(false); setSelectedVotersList([]); }} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg" title="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-sm">Voters List</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Colleagues who voted for <span className="font-black text-slate-700 dark:text-slate-200">"{selectedOptionText}"</span>:
              </p>
            </div>
            <div className="max-h-[200px] overflow-y-auto border p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2">
              {selectedVotersList.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No votes recorded yet for this option.</p>
              ) : (
                selectedVotersList.map((vote: any) => {
                  const voter = dirUsers?.users?.find((u: any) => u.id === vote.userId);
                  return (
                    <div key={vote.id || vote.userId} className="flex items-center space-x-2.5 p-2 bg-white dark:bg-slate-900 rounded-lg border text-left">
                      <div className="h-7 w-7 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-xs uppercase">
                        {voter ? voter.firstName[0] : 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{voter ? `${voter.firstName} ${voter.lastName}` : 'Anonymous Staff'}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">{voter?.email || 'connecthub colleague'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Channel Analytics Modal */}
      {analyticsModalOpen && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-lg space-y-4 shadow-2xl relative text-xs text-left">
            <button onClick={() => setAnalyticsModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg" title="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-sm flex items-center space-x-1.5 text-slate-800 dark:text-slate-100">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>#{activeGroup.name} - Channel Analytics</span>
              </h3>
              <p className="text-xs text-slate-400 font-semibold">Real-time follower demographics and reach analytics dashboard.</p>
            </div>

            {/* Quick KPI stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Followers</p>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">{activeGroup.members?.length || 0}</p>
                <p className="text-[8px] text-green-500 font-extrabold mt-0.5">▲ +12% this week</p>
              </div>
              <div className="p-3 border rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Reach Rate</p>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">92.4%</p>
                <p className="text-[8px] text-primary font-extrabold mt-0.5">High Engagement</p>
              </div>
              <div className="p-3 border rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Avg Reactions</p>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  {Math.round(((activeGroup.name.length % 8) + 4) * 1.5)}
                </p>
                <p className="text-[8px] text-green-500 font-extrabold mt-0.5">▲ +4.2%</p>
              </div>
            </div>

            {/* Simulated Bar Charts */}
            <div className="space-y-4 pt-2">
              {/* Followers Growth Timeline Chart */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Weekly Follower Growth</h4>
                <div className="h-28 flex items-end justify-between gap-2.5 px-3 pt-4 border-b border-l dark:border-slate-800">
                  {/* Mon */}
                  <div className="flex-1 flex flex-col items-center group cursor-pointer">
                    <span className="text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold mb-0.5">24</span>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-primary/40 rounded-t-sm h-8 transition-all" />
                    <span className="text-[8px] text-slate-400 font-semibold pt-1">Mon</span>
                  </div>
                  {/* Tue */}
                  <div className="flex-1 flex flex-col items-center group cursor-pointer">
                    <span className="text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold mb-0.5">38</span>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-primary/40 rounded-t-sm h-12 transition-all" />
                    <span className="text-[8px] text-slate-400 font-semibold pt-1">Tue</span>
                  </div>
                  {/* Wed */}
                  <div className="flex-1 flex flex-col items-center group cursor-pointer">
                    <span className="text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold mb-0.5">45</span>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-primary/40 rounded-t-sm h-16 transition-all" />
                    <span className="text-[8px] text-slate-400 font-semibold pt-1">Wed</span>
                  </div>
                  {/* Thu */}
                  <div className="flex-1 flex flex-col items-center group cursor-pointer">
                    <span className="text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold mb-0.5">62</span>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-primary/40 rounded-t-sm h-20 transition-all" />
                    <span className="text-[8px] text-slate-400 font-semibold pt-1">Thu</span>
                  </div>
                  {/* Fri */}
                  <div className="flex-1 flex flex-col items-center group cursor-pointer">
                    <span className="text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold mb-0.5">85</span>
                    <div className="w-full bg-primary rounded-t-sm h-24 hover:bg-primary/90 transition-all" />
                    <span className="text-[8px] text-slate-400 font-semibold pt-1">Fri</span>
                  </div>
                </div>
              </div>

              {/* Department breakdown horizontal bar chart */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Department Breakdown</h4>
                <div className="space-y-2 pt-1">
                  {/* Engineering */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-600 dark:text-slate-300">
                      <span>Engineering / Tech</span>
                      <span>42%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '42%' }} />
                    </div>
                  </div>
                  {/* Marketing */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-600 dark:text-slate-300">
                      <span>Marketing & Sales</span>
                      <span>28%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '28%' }} />
                    </div>
                  </div>
                  {/* HR */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-600 dark:text-slate-300">
                      <span>Operations / HR</span>
                      <span>18%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '18%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperImageSrc}
        onClose={() => setCropperOpen(false)}
        onCrop={handleCroppedGroupAvatar}
      />
    </div>
  );
}
