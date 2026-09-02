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
  scheduledFor,
  onScheduledForChange,
  departmentId,
  onDepartmentIdChange,
  departments,
  onSubmit,
  heading = 'Publish Company Notice',
  description = 'Post announcements or department memos to all employees.',
  submitLabel = 'Publish Bulletin',
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
  /** datetime-local string, or '' for "publish immediately". */
  scheduledFor: string;
  onScheduledForChange: (v: string) => void;
  /** '' means "all employees" (no department scoping). */
  departmentId: string;
  onDepartmentIdChange: (v: string) => void;
  departments: { id: string; name: string }[];
  onSubmit: (e: React.FormEvent) => void;
  /** Lets this same modal double as the "edit announcement" form — see
   *  announcements/page.tsx, which reuses it for both create and update
   *  rather than shipping a near-duplicate component. */
  heading?: string;
  description?: string;
  submitLabel?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-lg space-y-5 shadow-2xl relative">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-lg">{heading}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold">
          <div className="space-y-2">
            <label className="text-muted-foreground uppercase text-[10px]">Notice Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 Launch Event Details"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground uppercase text-[10px]">Notice Content</label>
            <textarea
              required
              placeholder="Write the details here..."
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none h-28 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-muted-foreground uppercase text-[10px]">Notice Priority</label>
              <select
                value={priority}
                onChange={(e) => onPriorityChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground uppercase text-[10px]">Notice Expiry Date</label>
              <input
                type="date"
                value={expiry}
                onChange={(e) => onExpiryChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-muted-foreground uppercase text-[10px]">Audience</label>
              <select
                value={departmentId}
                onChange={(e) => onDepartmentIdChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
              >
                <option value="">All Employees</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} only</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground uppercase text-[10px]">Publish At (optional)</label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => onScheduledForChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
              />
            </div>
          </div>
          {scheduledFor && (
            <p className="text-[10px] text-muted-foreground -mt-2 normal-case">
              This notice will stay hidden from your audience — visible only to you — until the scheduled time.
            </p>
          )}

          <label className="flex items-center space-x-2.5 p-1 cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={() => onPinnedChange(!pinned)}
              className="rounded text-primary focus:ring-primary/20 h-4 w-4"
            />
            <span className="text-xs text-foreground font-semibold">Pin notice to the top of the bulletin feed</span>
          </label>

          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-md">
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
