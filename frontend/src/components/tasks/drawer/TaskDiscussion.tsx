import React from 'react';
import { MessageSquare } from 'lucide-react';

export function TaskDiscussion({
  comments,
  commentValue,
  onCommentValueChange,
  onAddComment,
}: {
  comments: any[] | undefined;
  commentValue: string;
  onCommentValueChange: (v: string) => void;
  onAddComment: (e: React.FormEvent) => void;
}) {
  return (
    <div className="space-y-3 pt-3 border-t">
      <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center space-x-1.5">
        <MessageSquare className="h-4 w-4 text-indigo-500" />
        <span>Discussion ({comments?.length || 0})</span>
      </h4>

      <div className="max-h-[120px] overflow-y-auto space-y-2.5 pr-2">
        {!comments || comments.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic">No comments posted yet.</p>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border rounded-xl text-[10px] space-y-1">
              <div className="flex justify-between font-bold text-slate-450">
                <span>
                  {comment.user.firstName} {comment.user.lastName}
                </span>
                <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-normal">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={onAddComment} className="flex space-x-2">
        <input
          type="text"
          placeholder="Ask or comment..."
          value={commentValue}
          onChange={(e) => onCommentValueChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
        />
        <button type="submit" className="px-3 bg-primary text-white rounded-xl text-xs font-bold shadow">
          Post
        </button>
      </form>
    </div>
  );
}
