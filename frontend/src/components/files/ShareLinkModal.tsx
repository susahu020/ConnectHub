import React from 'react';
import { X, Copy } from 'lucide-react';

export function ShareLinkModal({
  fileName,
  generatedLink,
  onClose,
  expireHours,
  onExpireHoursChange,
  directoryUsers,
  currentUserId,
  selectedUserIds,
  onSelectedUserIdsChange,
  onSubmit,
  onCopyLink,
}: {
  fileName: string;
  generatedLink: string;
  onClose: () => void;
  expireHours: number;
  onExpireHoursChange: (v: number) => void;
  directoryUsers: any[];
  currentUserId?: string;
  selectedUserIds: string[];
  onSelectedUserIdsChange: (v: string[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCopyLink: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative animate-in fade-in duration-200">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground hover:bg-muted p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-base">Share expiring link</h3>
          <p className="text-xs text-muted-foreground">
            Generate a secure link to allow external or internal stakeholders to download &quot;{fileName}&quot;.
          </p>
        </div>

        {generatedLink ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 px-3 py-2 bg-muted dark:bg-card border rounded-xl text-xs select-all focus:outline-none font-mono"
              />
              <button onClick={onCopyLink} className="p-2 bg-primary text-primary-foreground rounded-xl shadow hover:bg-primary/95" title="Copy to clipboard">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-emerald-500 font-bold">✓ Share Link is active. It will expire based on your selection.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold">
            <div className="space-y-2">
              <label className="text-muted-foreground uppercase text-[10px]">Select Expiration Duration</label>
              <select
                value={expireHours}
                onChange={(e) => onExpireHoursChange(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
              >
                <option value={1}>1 Hour</option>
                <option value={8}>8 Hours</option>
                <option value={24}>24 Hours (1 Day)</option>
                <option value={168}>168 Hours (1 Week)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground uppercase text-[10px]">Notify Team Members Directly (Optional)</label>
              <div className="max-h-28 overflow-y-auto border rounded-xl p-2 bg-muted dark:bg-card space-y-1.5 scrollbar-thin">
                {directoryUsers.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic p-1">No other team members found.</p>
                ) : (
                  directoryUsers
                    .filter((u) => u.id !== currentUserId)
                    .map((u) => (
                      <label key={u.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted dark:hover:bg-card p-1 rounded transition-all">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onSelectedUserIdsChange([...selectedUserIds, u.id]);
                            } else {
                              onSelectedUserIdsChange(selectedUserIds.filter((id) => id !== u.id));
                            }
                          }}
                          className="rounded border-border dark:border-border text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="text-[10px] font-semibold text-foreground dark:text-foreground">
                          {u.firstName} {u.lastName} ({u.email})
                        </span>
                      </label>
                    ))
                )}
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md">
              Generate Share Link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
