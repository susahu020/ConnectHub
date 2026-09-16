import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Check, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../../services/api';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${STATUS_STYLES[status] || 'bg-muted text-muted-foreground border-border'}`}>
      {status}
    </span>
  );
}

function toDatetimeLocal(dateStr: string, timeStr: string) {
  // Combines a yyyy-mm-dd date with an HH:MM time into an ISO string the
  // backend's `new Date(...)` parses the same way clockIn/clockOut do.
  if (!dateStr || !timeStr) return undefined;
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

function RequestCorrectionModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');
  const [clockInTime, setClockInTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.requestRegularization({
        date,
        requestedClockIn: toDatetimeLocal(date, clockInTime),
        requestedClockOut: toDatetimeLocal(date, clockOutTime),
        reason,
      }),
    onSuccess: () => {
      toast.success('Correction request submitted');
      queryClient.invalidateQueries({ queryKey: ['hr-regularizations-mine'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit request'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-foreground">Request Attendance Correction</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Date</label>
            <input type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm font-bold focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Correct Clock In</label>
              <input type="time" value={clockInTime} onChange={(e) => setClockInTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm font-bold focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Correct Clock Out</label>
              <input type="time" value={clockOutTime} onChange={(e) => setClockOutTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm font-bold focus:outline-none" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Only fill in the field(s) that need correcting — leave the other blank to keep it as recorded (or if there's no record at all yet, at least Clock In is required).</p>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="e.g. Forgot to clock out, left around 6pm"
              className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm focus:outline-none resize-none" />
          </div>
        </div>
        <button
          disabled={!date || !reason.trim() || (!clockInTime && !clockOutTime) || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Submit Request
        </button>
      </div>
    </div>
  );
}

export function RegularizationPanel({ isManager }: { isManager: boolean }) {
  const queryClient = useQueryClient();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const { data: myRequests = [] } = useQuery({ queryKey: ['hr-regularizations-mine'], queryFn: api.getMyRegularizations });
  const { data: toReview = [] } = useQuery({
    queryKey: ['hr-regularizations-to-review'],
    queryFn: api.getRegularizationsToReview,
    enabled: isManager,
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => {
      setDecidingId(id);
      return api.updateRegularizationStatus(id, { status });
    },
    onSuccess: (_res, variables) => {
      toast.success(variables.status === 'APPROVED' ? 'Request approved' : 'Request rejected');
      queryClient.invalidateQueries({ queryKey: ['hr-regularizations-to-review'] });
      queryClient.invalidateQueries({ queryKey: ['hr-attendance-logs'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update request'),
    onSettled: () => setDecidingId(null),
  });

  const pendingToReview = toReview.filter((r: any) => r.status === 'PENDING');

  return (
    <div className="space-y-6 mt-6">
      {isManager && pendingToReview.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">Correction Requests To Review</h3>
          <div className="space-y-2">
            {pendingToReview.map((r: any) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground">
                    {r.user?.firstName} {r.user?.lastName} — {new Date(r.date).toLocaleDateString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.requestedClockIn && `In: ${new Date(r.requestedClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} `}
                    {r.requestedClockOut && `Out: ${new Date(r.requestedClockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} `}
                    — &quot;{r.reason}&quot;
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={decidingId === r.id}
                    onClick={() => decideMutation.mutate({ id: r.id, status: 'APPROVED' })}
                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50"
                    title="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    disabled={decidingId === r.id}
                    onClick={() => decideMutation.mutate({ id: r.id, status: 'REJECTED' })}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-50"
                    title="Reject"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">My Correction Requests</h3>
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Request Correction
          </button>
        </div>
        {myRequests.length === 0 ? (
          <p className="text-xs text-muted-foreground">No correction requests yet.</p>
        ) : (
          <div className="space-y-2">
            {myRequests.map((r: any) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <span className="font-bold text-foreground">{new Date(r.date).toLocaleDateString()}</span>
                  <span className="text-muted-foreground"> — {r.reason}</span>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {showRequestModal && <RequestCorrectionModal onClose={() => setShowRequestModal(false)} />}
    </div>
  );
}
