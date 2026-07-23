'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';
import { AnnouncementMetricsBar } from '../../../components/announcements/AnnouncementMetricsBar';
import { AnnouncementFilters } from '../../../components/announcements/AnnouncementFilters';
import { AnnouncementList } from '../../../components/announcements/AnnouncementList';
import { AnnouncementDetailPanel } from '../../../components/announcements/AnnouncementDetailPanel';
import { ReadReceiptsModal } from '../../../components/announcements/ReadReceiptsModal';
import { CreateAnnouncementModal } from '../../../components/announcements/CreateAnnouncementModal';

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [activeAnn, setActiveAnn] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [viewersOpen, setViewersOpen] = useState(false);

  // Search & Filter bulletin list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');

  // Creation modal
  const [createOpen, setCreateOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [annPinned, setAnnPinned] = useState(false);
  const [annExpiry, setAnnExpiry] = useState('');

  // Fetch announcements
  const { data: announcements, isLoading, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.getAnnouncements(''),
  });

  // Read receipts — who has (and hasn't) viewed the active announcement.
  // Only meaningful for the creator/admin, and the backend enforces that
  // restriction too, so a 403 here just quietly shows nothing.
  const { data: viewersData, isLoading: loadingViewers } = useQuery({
    queryKey: ['announcement-viewers', activeAnn?.id],
    queryFn: () => api.getAnnouncementViewers(activeAnn.id),
    enabled: !!activeAnn?.id && viewersOpen,
  });

  const handleDeleteAnnouncement = async (id: string) => {
    if (
      !(await confirm({
        title: 'Delete Bulletin Notice',
        message: 'Are you absolutely sure you want to delete this bulletin notice? This action cannot be undone.',
        confirmText: 'Delete Notice',
        type: 'danger',
      }))
    )
      return;
    try {
      await api.deleteAnnouncement(id);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      if (activeAnn?.id === id) {
        setActiveAnn(null);
      }
      toast.success('Bulletin notice deleted.');
    } catch (err) {
      toast.error('Failed to delete bulletin notice.');
    }
  };

  const filteredAnnouncements =
    announcements?.filter((ann: any) => {
      const matchesSearch =
        !searchQuery.trim() ||
        ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ann.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === 'ALL' || ann.priority === filterPriority;
      return matchesSearch && matchesPriority;
    }) || [];

  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Create Announcement Mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => api.createAnnouncement(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setCreateOpen(false);
      setAnnTitle('');
      setAnnContent('');
      setAnnExpiry('');
      setAnnPinned(false);
      toast.success('Announcement published successfully.');
    },
    onError: () => {
      toast.error('Failed to publish announcement.');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    createMutation.mutate({
      title: annTitle,
      content: annContent,
      priority: annPriority,
      isPinned: annPinned,
      expiresAt: annExpiry || null,
    });
  };

  const handleOpenDetails = async (id: string) => {
    try {
      const data = await api.getAnnouncementDetails(id);
      setActiveAnn(data);
      setViewersOpen(false);
      // Refresh count logs
      refetch();
    } catch (err) {
      toast.error('Failed to load announcement details.');
    }
  };

  const handleLike = async (id: string) => {
    try {
      const result = await api.likeAnnouncement(id);
      if (activeAnn && activeAnn.id === id) {
        setActiveAnn((prev: any) => ({
          ...prev,
          isLiked: result.liked,
          likes: result.liked ? [...prev.likes, { userId: user?.id }] : prev.likes.filter((l: any) => l.userId !== user?.id),
        }));
      }
      refetch();
    } catch (err) {
      toast.error('Failed to toggle like.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeAnn) return;

    try {
      const comment = await api.addAnnouncementComment(activeAnn.id, commentText);
      setActiveAnn((prev: any) => ({
        ...prev,
        comments: [...prev.comments, comment],
      }));
      setCommentText('');
      refetch();
      toast.success('Comment posted.');
    } catch (err) {
      toast.error('Failed to post comment.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (
      !(await confirm({
        title: 'Delete Comment',
        message: 'Are you sure you want to delete this comment?',
        confirmText: 'Delete Comment',
        type: 'danger',
      }))
    )
      return;
    try {
      await api.deleteAnnouncementComment(activeAnn.id, commentId);
      setActiveAnn((prev: any) => ({
        ...prev,
        comments: prev.comments.filter((c: any) => c.id !== commentId),
      }));
      refetch();
      toast.success('Comment deleted.');
    } catch (err) {
      toast.error('Failed to delete comment.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Organization Bulletins</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Stay up to date with notices, department memos, and company achievements.</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Publish Notice</span>
          </button>
        )}
      </div>

      <AnnouncementMetricsBar announcements={announcements} />

      <AnnouncementFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filterPriority={filterPriority}
        onFilterPriorityChange={setFilterPriority}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start h-[calc(100vh-21rem)] overflow-y-auto pb-6">
        <AnnouncementList
          isLoading={isLoading}
          announcements={sortedAnnouncements}
          activeId={activeAnn?.id}
          onSelect={handleOpenDetails}
        />

        <AnnouncementDetailPanel
          announcement={activeAnn}
          currentUserId={user?.id}
          currentUserRole={user?.role}
          onDelete={handleDeleteAnnouncement}
          onLike={handleLike}
          onOpenReadReceipts={() => setViewersOpen(true)}
          onDeleteComment={handleDeleteComment}
          commentText={commentText}
          onCommentTextChange={setCommentText}
          onAddComment={handleAddComment}
        />
      </div>

      {viewersOpen && activeAnn && (
        <ReadReceiptsModal
          announcementTitle={activeAnn.title}
          loading={loadingViewers}
          data={viewersData}
          onClose={() => setViewersOpen(false)}
        />
      )}

      <CreateAnnouncementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={annTitle}
        onTitleChange={setAnnTitle}
        content={annContent}
        onContentChange={setAnnContent}
        priority={annPriority}
        onPriorityChange={(v) => setAnnPriority(v as any)}
        expiry={annExpiry}
        onExpiryChange={setAnnExpiry}
        pinned={annPinned}
        onPinnedChange={setAnnPinned}
        onSubmit={handleCreateSubmit}
      />
    </div>
  );
}
