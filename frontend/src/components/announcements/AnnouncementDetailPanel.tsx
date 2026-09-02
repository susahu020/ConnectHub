import React from 'react';
import { Trash2, Pencil, Heart, Eye, Users, MessageSquare, Megaphone } from 'lucide-react';
import { getPriorityBadge } from './announcementHelpers';

export function AnnouncementDetailPanel({
  announcement,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
  onLike,
  onOpenReadReceipts,
  onDeleteComment,
  commentText,
  onCommentTextChange,
  onAddComment,
}: {
  announcement: any | null;
  currentUserId?: string;
  currentUserRole?: string;
  onEdit: (announcement: any) => void;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  onOpenReadReceipts: () => void;
  onDeleteComment: (commentId: string) => void;
  commentText: string;
  onCommentTextChange: (v: string) => void;
  onAddComment: (e: React.FormEvent) => void;
}) {
  if (!announcement) {
    return (
      <div className="bg-card dark:bg-card border rounded-2xl p-6 shadow-sm sticky top-0 min-h-[300px] flex flex-col items-center justify-center py-20 text-muted-foreground text-center space-y-3">
        <Megaphone className="h-10 w-10 stroke-1" />
        <p className="text-xs">Select a bulletin from the list on the left to read details and discuss.</p>
      </div>
    );
  }

  const canManage = currentUserRole === 'ADMIN' || announcement.creatorId === currentUserId;
  const canViewReceipts = currentUserRole === 'ADMIN' || announcement.creator?.id === currentUserId;

  return (
    <div className="bg-card dark:bg-card border rounded-2xl p-6 shadow-sm sticky top-0 min-h-[300px]">
      <div className="space-y-6">
        <div className="space-y-2 border-b pb-3 relative text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(announcement.priority)}`}>
                {announcement.priority}
              </span>
              {announcement.scheduledFor && new Date(announcement.scheduledFor).getTime() > Date.now() && (
                <span
                  className="text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-500 dark:border-amber-950"
                  title={`Only visible to you until ${new Date(announcement.scheduledFor).toLocaleString()}`}
                >
                  Scheduled
                </span>
              )}
            </div>
            {canManage && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(announcement)}
                  className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                  title="Edit Bulletin Notice"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(announcement.id)}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                  title="Delete Bulletin Notice"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <h3 className="font-extrabold text-base leading-snug">{announcement.title}</h3>
          <p className="text-[10px] text-muted-foreground">
            Published by {announcement.creator.firstName} • {new Date(announcement.createdAt).toLocaleString()}
            {announcement.updatedAt && announcement.updatedAt !== announcement.createdAt && (
              <span className="italic"> • edited {new Date(announcement.updatedAt).toLocaleString()}</span>
            )}
          </p>
        </div>

        <p className="text-xs leading-relaxed text-foreground whitespace-pre-line">{announcement.content}</p>

        <div className="flex items-center justify-between border-y py-2.5">
          <button
            onClick={() => onLike(announcement.id)}
            className={`flex items-center space-x-1.5 text-xs font-bold transition-all ${
              announcement.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
            }`}
          >
            <Heart className={`h-4.5 w-4.5 ${announcement.isLiked ? 'fill-current' : ''}`} />
            <span>{announcement.likes?.length || 0} Likes</span>
          </button>
          <span className="text-[10px] text-muted-foreground font-semibold flex items-center space-x-1">
            <Eye className="h-4 w-4" />
            <span>{announcement.viewsCount} views</span>
          </span>
        </div>

        {canViewReceipts && (
          <button
            onClick={onOpenReadReceipts}
            className="flex items-center justify-center space-x-1.5 w-full py-2 border rounded-xl text-[10px] font-bold text-muted-foreground hover:bg-muted dark:hover:bg-card transition-all"
          >
            <Users className="h-3.5 w-3.5" />
            <span>View Read Receipts</span>
          </button>
        )}

        <div className="space-y-4">
          <h4 className="font-bold text-xs uppercase text-muted-foreground flex items-center space-x-1.5">
            <MessageSquare className="h-4 w-4" />
            <span>Discussion ({announcement.comments?.length || 0})</span>
          </h4>

          <div className="max-h-56 overflow-y-auto space-y-3 pr-2">
            {announcement.comments?.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">No comments yet. Start the conversation!</p>
            ) : (
              announcement.comments?.map((comment: any) => (
                <div key={comment.id} className="p-3 bg-muted dark:bg-card border rounded-xl text-[10px] space-y-1 relative group">
                  <div className="flex justify-between font-bold text-muted-foreground">
                    <span>
                      {comment.user.firstName} {comment.user.lastName}
                    </span>
                    <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-foreground leading-normal">{comment.content}</p>

                  {(comment.userId === currentUserId || currentUserRole === 'ADMIN') && (
                    <button
                      onClick={() => onDeleteComment(comment.id)}
                      className="absolute right-2 bottom-2 text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={onAddComment} className="flex space-x-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => onCommentTextChange(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border bg-muted dark:bg-card text-xs focus:outline-none"
              required
            />
            <button type="submit" className="px-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold">
              Comment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
