import React, { useState } from 'react';
import { X, Paperclip, Loader2 } from 'lucide-react';
import { api } from '../../../services/api';

export function RequestLeaveModal({ open, onClose, isPending, onSubmit }: { open: boolean; onClose: () => void; isPending: boolean; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

  const handleAttachmentChange = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.uploadFile(formData);
      setAttachmentUrl(response.url);
      setAttachmentName(file.name);
    } catch (err) {
      // Non-blocking — the leave request can still be submitted without
      // an attachment; the employee just retries the upload if they want one.
      setAttachmentUrl('');
      setAttachmentName('');
    } finally {
      setUploading(false);
    }
  };

  // Half-day only makes sense for a single day, so checking it snaps
  // endDate to match startDate — and changing startDate afterward keeps
  // them in sync rather than silently leaving a stale multi-day range
  // with the half-day box still checked.
  const handleHalfDayToggle = (checked: boolean) => {
    setIsHalfDay(checked);
    if (checked) setEndDate(startDate);
  };
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (isHalfDay) setEndDate(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-black text-foreground">Apply for Leave</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted dark:hover:bg-card rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            onSubmit(e);
            if (!isPending) {
              setStartDate('');
              setEndDate('');
              setIsHalfDay(false);
              setAttachmentUrl('');
              setAttachmentName('');
            }
          }}
          className="space-y-4"
        >
          {/* Hidden field so the parent's plain target.attachmentUrl.value
              read (same pattern as every other field here) picks this up
              without needing to change that call site's approach. */}
          <input type="hidden" name="attachmentUrl" value={attachmentUrl} readOnly />
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Leave Type</label>
            <select name="leaveType" required className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
              <option value="ANNUAL">Annual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="UNPAID">Unpaid Leave</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Start Date</label>
              <input
                type="date" name="startDate" required value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">End Date</label>
              <input
                type="date" name="endDate" required value={endDate} disabled={isHalfDay}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-foreground">
            <input
              type="checkbox" name="isHalfDay" checked={isHalfDay}
              onChange={(e) => handleHalfDayToggle(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Half day (deducts 0.5 from your balance)
          </label>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Reason for leave</label>
            <textarea name="reason" rows={3} required placeholder="Write a short explanation..." className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Supporting document (optional)</label>
            <label className="flex items-center gap-2 w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-secondary dark:hover:bg-card/70">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Paperclip className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{uploading ? 'Uploading...' : attachmentName || 'Attach a file (e.g. medical certificate)'}</span>
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleAttachmentChange(e.target.files?.[0])}
              />
            </label>
          </div>
          <button type="submit" disabled={isPending || uploading} className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50">
            {isPending ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
