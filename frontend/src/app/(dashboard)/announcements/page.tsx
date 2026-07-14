'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Megaphone, 
  Plus, 
  X, 
  Heart, 
  MessageSquare, 
  Eye, 
  Pin,
  Calendar,
  Loader2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [activeAnn, setActiveAnn] = useState<any>(null);
  const [commentText, setCommentText] = useState('');

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

  const handleDeleteAnnouncement = async (id: string) => {
    if (!await confirm({
      title: 'Delete Bulletin Notice',
      message: 'Are you absolutely sure you want to delete this bulletin notice? This action cannot be undone.',
      confirmText: 'Delete Notice',
      type: 'danger'
    })) return;
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

  const filteredAnnouncements = announcements?.filter((ann: any) => {
    const matchesSearch = !searchQuery.trim() || 
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
    onError: (err) => {
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
    if (!await confirm({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment?',
      confirmText: 'Delete Comment',
      type: 'danger'
    })) return;
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
      case 'HIGH': return 'text-orange-500 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900';
      case 'NORMAL': return 'text-primary bg-primary/5 border-primary/20';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Bulletins Summary Metrics bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
        {[
          { label: 'Total Bulletins', value: announcements?.length || 0, icon: '📢', color: 'bg-blue-50/50 dark:bg-blue-950/15 text-blue-600 border-blue-100 dark:border-blue-900/30' },
          { label: 'Total Views', value: announcements?.reduce((acc: number, cur: any) => acc + (cur.viewsCount || 0), 0) || 0, icon: '👁️', color: 'bg-primary/5 text-primary border-primary/10' },
          { label: 'Urgent Notices', value: announcements?.filter((a: any) => a.priority === 'URGENT').length || 0, icon: '🔥', color: 'bg-red-50/50 dark:bg-red-950/15 text-red-500 border-red-100 dark:border-red-900/30' },
          { label: 'Pinned bulletins', value: announcements?.filter((a: any) => a.isPinned).length || 0, icon: '📌', color: 'bg-amber-50/50 dark:bg-amber-950/15 text-amber-500 border-amber-100 dark:border-amber-900/30' }
        ].map((card, idx) => (
          <div key={idx} className="p-4 border rounded-2xl flex items-center justify-between shadow-2xs bg-white dark:bg-slate-900">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-450">{card.label}</span>
              <p className="text-lg font-black tracking-tight leading-none text-slate-800 dark:text-slate-205">{card.value}</p>
            </div>
            <span className="text-xl leading-none">{card.icon}</span>
          </div>
        ))}
      </div>

      {/* Bulletins Search and Priority Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-2xs text-xs font-bold text-slate-700 dark:text-slate-350">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search notices by title/content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
            />
            {/* Search Magnifier SVG Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.603 10.603z" />
            </svg>
          </div>

          {/* Priority filter dropdown */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-slate-400 uppercase">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        {/* Clear filter action */}
        {(searchQuery || filterPriority !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterPriority('ALL');
            }}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-805 text-xs transition-all font-semibold"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Bulletins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start h-[calc(100vh-21rem)] overflow-y-auto pb-6">
        {/* Notices list pane */}
        <div className="md:col-span-2 space-y-4">
          {isLoading ? (
            <div className="text-center text-xs text-slate-400 py-10">Loading bulletins...</div>
          ) : sortedAnnouncements.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-10 border rounded-2xl bg-white dark:bg-slate-900">
              No matching bulletins found.
            </div>
          ) : (
            sortedAnnouncements.map((ann: any) => (
              <div
                key={ann.id}
                onClick={() => handleOpenDetails(ann.id)}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden space-y-3 ${
                  activeAnn?.id === ann.id ? 'border-primary ring-2 ring-primary/10' : ''
                }`}
              >
                {ann.isPinned && (
                  <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[8px] font-extrabold uppercase px-2.5 py-1 rounded-bl border-l border-b border-primary/20 flex items-center space-x-0.5">
                    <Pin className="h-2.5 w-2.5" />
                    <span>Pinned</span>
                  </div>
                )}

                {ann.expiresAt && new Date(ann.expiresAt) < new Date() && (
                  <div className="absolute top-0 right-16 bg-slate-100 dark:bg-slate-800 text-slate-450 text-[8px] font-extrabold uppercase px-2.5 py-1 rounded-bl border-l border-b border-slate-200 dark:border-slate-700 flex items-center space-x-0.5">
                    <span>Expired</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(ann.priority)}`}>
                    {ann.priority}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Published by {ann.creator.firstName} {ann.creator.lastName}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm leading-snug">{ann.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{ann.content}</p>

                {/* Foot indicators */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t font-semibold">
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </span>

                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{ann.viewsCount} views</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Heart className="h-3.5 w-3.5" />
                      <span>{ann._count?.likes || 0} likes</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{ann._count?.comments || 0} replies</span>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected bulletin details pane */}
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm sticky top-0 min-h-[300px]">
          {activeAnn ? (
            <div className="space-y-6">
              <div className="space-y-2 border-b pb-3 relative text-left">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(activeAnn.priority)}`}>
                    {activeAnn.priority}
                  </span>
                  {(user?.role === 'ADMIN' || activeAnn.creatorId === user?.id) && (
                    <button
                      onClick={() => handleDeleteAnnouncement(activeAnn.id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                      title="Delete Bulletin Notice"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <h3 className="font-extrabold text-base leading-snug">{activeAnn.title}</h3>
                <p className="text-[10px] text-slate-400">
                  Published by {activeAnn.creator.firstName} • {new Date(activeAnn.createdAt).toLocaleString()}
                </p>
              </div>

              <p className="text-xs leading-relaxed text-foreground whitespace-pre-line">{activeAnn.content}</p>

              <div className="flex items-center justify-between border-y py-2.5">
                <button
                  onClick={() => handleLike(activeAnn.id)}
                  className={`flex items-center space-x-1.5 text-xs font-bold transition-all ${
                    activeAnn.isLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
                  }`}
                >
                  <Heart className={`h-4.5 w-4.5 ${activeAnn.isLiked ? 'fill-current' : ''}`} />
                  <span>{activeAnn.likes?.length || 0} Likes</span>
                </button>
                <span className="text-[10px] text-slate-400 font-semibold flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{activeAnn.viewsCount} views</span>
                </span>
              </div>

              {/* Comments/Replies */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center space-x-1.5">
                  <MessageSquare className="h-4 w-4" />
                  <span>Discussion ({activeAnn.comments?.length || 0})</span>
                </h4>

                <div className="max-h-56 overflow-y-auto space-y-3 pr-2">
                  {activeAnn.comments?.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No comments yet. Start the conversation!</p>
                  ) : (
                    activeAnn.comments?.map((comment: any) => (
                      <div key={comment.id} className="p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-[10px] space-y-1 relative group">
                        <div className="flex justify-between font-bold text-slate-500">
                          <span>{comment.user.firstName} {comment.user.lastName}</span>
                          <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-foreground leading-normal">{comment.content}</p>
                        
                        {(comment.userId === user?.id || user?.role === 'ADMIN') && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="absolute right-2 bottom-2 text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-850 text-xs focus:outline-none"
                    required
                  />
                  <button type="submit" className="px-3 bg-primary text-white rounded-xl text-xs font-bold">
                    Comment
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center space-y-3">
              <Megaphone className="h-10 w-10 stroke-1" />
              <p className="text-xs">Select a bulletin from the list on the left to read details and discuss.</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-lg space-y-5 shadow-2xl relative">
            <button onClick={() => setCreateOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-lg">Publish Company Notice</h3>
              <p className="text-xs text-slate-400">Post announcements or department memos to all employees.</p>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Launch Event Details"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Notice Content</label>
                <textarea
                  required
                  placeholder="Write the details here..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-28 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[10px]">Notice Priority</label>
                  <select
                    value={annPriority}
                    onChange={(e: any) => setAnnPriority(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[10px]">Notice Expiry Date</label>
                  <input
                    type="date"
                    value={annExpiry}
                    onChange={(e) => setAnnExpiry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2.5 p-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annPinned}
                  onChange={() => setAnnPinned(!annPinned)}
                  className="rounded text-primary focus:ring-primary/20 h-4 w-4"
                />
                <span className="text-xs text-foreground font-semibold">Pin notice to the top of the bulletin feed</span>
              </label>

              <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-md">
                Publish Bulletin
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
