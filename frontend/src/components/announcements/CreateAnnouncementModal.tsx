import React from 'react';
import { X } from 'lucide-react';

export function CreateAnnouncementModal({
  open,
  onClose,
  title,
  onTitleChange,
  content,
  onContentChange,
  priority,
  onPriorityChange,
  expiry,
  onExpiryChange,
  pinned,
  onPinnedChange,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (v: string) => void;
  content: string;
  onContentChange: (v: string) => void;
  priority: string;
  onPriorityChange: (v: string) => void;
  expiry: string;
  onExpiryChange: (v: string) => void;
  pinned: boolean;
  onPinnedChange: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-lg space-y-5 shadow-2xl relative">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-lg">Publish Company Notice</h3>
          <p className="text-xs text-slate-400">Post announcements or department memos to all employees.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold">
          <div className="space-y-2">
            <label className="text-slate-400 uppercase text-[10px]">Notice Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 Launch Event Details"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 uppercase text-[10px]">Notice Content</label>
            <textarea
              required
              placeholder="Write the details here..."
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-28 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-slate-400 uppercase text-[10px]">Notice Priority</label>
              <select
                value={priority}
                onChange={(e) => onPriorityChange(e.target.value)}
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
                value={expiry}
                onChange={(e) => onExpiryChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center space-x-2.5 p-1 cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={() => onPinnedChange(!pinned)}
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
  );
}
