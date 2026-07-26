import React from 'react';
import { X, ShieldAlert, Loader2, ShieldCheck } from 'lucide-react';

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

/**
 * Shown when a self-service account deletion is blocked because the
 * requester is the workspace's last remaining Admin (see
 * accountDeletion.service.ts's LAST_ADMIN check). Rather than just telling
 * the user to go promote someone else and try again later, this lets them
 * pick a replacement Admin and complete both steps — promote, then delete —
 * in one place.
 */
export function PromoteAdminModal({
  candidates,
  loadingCandidates,
  selectedUserId,
  onSelectedUserChange,
  submitting,
  onClose,
  onConfirm,
}: {
  candidates: Candidate[];
  loadingCandidates: boolean;
  selectedUserId: string;
  onSelectedUserChange: (id: string) => void;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative animate-in fade-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-550 hover:bg-slate-100 p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-amber-500">
          <ShieldAlert className="h-5 w-5" />
          <h3 className="font-bold text-sm">Assign a New Admin First</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          You're the only Admin in this workspace, so it can't be left without one. Promote a teammate to Admin
          to continue — they'll be promoted and your account deleted in the same step.
        </p>

        {loadingCandidates ? (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
            There's no one else in this workspace yet. Invite a teammate first — once they've joined, come back
            here to promote them and delete your account.
          </p>
        ) : (
          <select
            value={selectedUserId}
            onChange={(e) => onSelectedUserChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            <option value="">-- Select a teammate to promote --</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} ({c.email}){c.role === 'ADMIN' ? ' — Admin' : ''}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={onConfirm}
          disabled={submitting || loadingCandidates || !selectedUserId}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs disabled:opacity-50 transition-colors"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Promote & Delete My Account
        </button>
      </div>
    </div>
  );
}
