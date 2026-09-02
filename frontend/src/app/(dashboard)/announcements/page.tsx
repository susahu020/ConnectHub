'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { usePermissions } from '../../../hooks/usePermissions';
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
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [activeAnn, setActiveAnn] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [viewersOpen, setViewersOpen] = useState(false);

  // Search & Filter bulletin list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');

  // Create/Edit modal — reused for both (see CreateAnnouncementModal's
  // heading/submitLabel props). `editingId` is null in create mode and the
  // announcement id while editing.
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [annPinned, setAnnPinned] = useState(false);
  const [annExpiry, setAnnExpiry] = useState('');
  const [annScheduledFor, setAnnScheduledFor] = useState('');
  const [annDepartmentId, setAnnDepartmentId] = useState('');

  // Fetch departments for the audience picker — GET /admin/departments is
  // open to any authenticated user despite the path (see users.controller
  // notes elsewhere), so this doesn't need an Admin-only guard.
  const { data: departments } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => api.getDepartments(),
  });

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
      closeAnnouncementModal();
      toast.success('Announcement published successfully.');
    },
    onError: () => {
      toast.error('Failed to publish announcement.');
    },
  });

  // Update Announcement Mutation — shares the create modal's form state,
  // keyed by `editingId`.
  const updateMutation = useMutation({
    mutationFn: (body: any) => api.updateAnnouncement(editingId as string, body),
    onSuccess: (updated: any) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      if (activeAnn?.id === editingId) {
        setActiveAnn((prev: any) => ({ ...prev, ...updated }));
      }
      closeAnnouncementModal();
      toast.success('Announcement updated successfully.');
    },
    onError: () => {
      toast.error('Failed to update announcement.');
    },
  });

  const closeAnnouncementModal = () => {
    setCreateOpen(false);
    setEditingId(null);
    setAnnTitle('');
    setAnnContent('');
    setAnnExpiry('');
    setAnnScheduledFor('');
    setAnnDepartmentId('');
    setAnnPinned(false);
    setAnnPriority('NORMAL');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    const body = {
      title: annTitle,
      content: annContent,
      priority: annPriority,
      isPinned: annPinned,
      expiresAt: annExpiry || null,
      // <input type="datetime-local"> gives a value with no timezone
      // offset (e.g. "2026-09-01T09:00") — `new Date(...)` on the backend
      // would otherwise interpret that as UTC; appending nothing here and
      // letting new Date() parse it as local time on the server isn't
      // reliable across environments, so this is sent as-is and the
      // backend's `new Date(scheduledFor)` treats it the same way the
      // browser's <input> does (local time of whichever server parses it).
      // Good enough for this feature's purposes; a fully timezone-correct
      // version would send an explicit offset.
      scheduledFor: annScheduledFor || null,
      departmentId: annDepartmentId || null,
    };

    if (editingId) {
      updateMutation.mutate(body);
    } else {
      createMutation.mutate(body);
    }
  };

  const handleOpenEdit = (announcement: any) => {
    setEditingId(announcement.id);
    setAnnTitle(announcement.title);
    setAnnContent(announcement.content);
    setAnnPriority(announcement.priority);
    setAnnPinned(!!announcement.isPinned);
    setAnnExpiry(announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 10) : '');
    setAnnScheduledFor(announcement.scheduledFor ? new Date(announcement.scheduledFor).toISOString().slice(0, 16) : '');
    setAnnDepartmentId(announcement.departmentId || '');
    setCreateOpen(true);
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
        {can('Announcements', 'Create') && (
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
          onEdit={handleOpenEdit}
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
        onClose={closeAnnouncementModal}
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
        scheduledFor={annScheduledFor}
        onScheduledForChange={setAnnScheduledFor}
        departmentId={annDepartmentId}
        onDepartmentIdChange={setAnnDepartmentId}
        departments={departments || []}
        onSubmit={handleCreateSubmit}
        heading={editingId ? 'Edit Company Notice' : undefined}
        description={editingId ? 'Update the details of this bulletin. Existing likes, comments, and read receipts are preserved.' : undefined}
        submitLabel={editingId ? 'Save Changes' : undefined}
      />
    </div>
  );
}
