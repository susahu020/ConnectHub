import React from 'react';
import { X } from 'lucide-react';

export function RecognizeTeammateModal({
  open,
  onClose,
  employees,
  currentUserId,
  selectedTeammateId,
  onSelectedTeammateIdChange,
  praiseMessage,
  onPraiseMessageChange,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  employees: any[];
  currentUserId?: string;
  selectedTeammateId: string;
  onSelectedTeammateIdChange: (v: string) => void;
  praiseMessage: string;
  onPraiseMessageChange: (v: string) => void;
  isPending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-black text-foreground">Recognize a Teammate</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted dark:hover:bg-card rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Who would you like to recognize?</label>
            <select
              name="receiverId"
              value={selectedTeammateId}
              onChange={(e) => onSelectedTeammateIdChange(e.target.value)}
              required
              className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
            >
              <option value="">— Select Teammate —</option>
              {employees
                .filter((emp: any) => emp.id !== currentUserId)
                .map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Choose a Badge</label>
            <select name="badge" className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
              <option value="TEAM_PLAYER">🤝 Team Player</option>
              <option value="INNOVATOR">💡 Innovator</option>
              <option value="CUSTOMER_CHAMPION">🏆 Customer Champion</option>
              <option value="ROCKSTAR">⭐ Rockstar</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Praise Message</label>
            <textarea
              name="message"
              rows={3}
              required
              value={praiseMessage}
              onChange={(e) => onPraiseMessageChange(e.target.value)}
              placeholder="Write a public message of appreciation..."
              className="w-full bg-muted dark:bg-card border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
            />
          </div>
          <button type="submit" disabled={isPending} className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:bg-primary-dark transition-all">
            {isPending ? 'Sending...' : 'Send Recognition'}
          </button>
        </form>
      </div>
    </div>
  );
}
