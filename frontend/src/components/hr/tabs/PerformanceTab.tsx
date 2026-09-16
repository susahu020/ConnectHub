import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Square, Trash2, Star, X, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../../services/api';

const CYCLE_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border',
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  CLOSED: 'bg-secondary text-muted-foreground border-border',
};

const REVIEW_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  SUBMITTED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ACKNOWLEDGED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

function StatusBadge({ status, styles }: { status: string; styles: Record<string, string> }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${styles[status] || 'bg-muted text-muted-foreground border-border'}`}>
      {status}
    </span>
  );
}

function StarRating({ value, onChange, readOnly }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={readOnly ? 'cursor-default' : 'cursor-pointer'}
        >
          <Star className={`h-5 w-5 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );
}

function CreateCycleModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.createReviewCycle({ name, startDate, endDate }),
    onSuccess: () => {
      toast.success('Review cycle created');
      queryClient.invalidateQueries({ queryKey: ['hr-performance-cycles'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create cycle'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-foreground">New Review Cycle</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. H1 2026 Review"
              className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm font-bold focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm font-bold focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm font-bold focus:outline-none" />
            </div>
          </div>
        </div>
        <button
          disabled={!name || !startDate || !endDate || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create Cycle
        </button>
      </div>
    </div>
  );
}

function SubmitReviewModal({ review, onClose }: { review: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(review.overallRating || 0);
  const [strengths, setStrengths] = useState(review.strengths || '');
  const [areas, setAreas] = useState(review.areasForImprovement || '');
  const [goals, setGoals] = useState(review.goalsForNextCycle || '');
  const [comments, setComments] = useState(review.managerComments || '');

  const mutation = useMutation({
    mutationFn: () => api.submitPerformanceReview(review.id, {
      overallRating: rating,
      strengths,
      areasForImprovement: areas,
      goalsForNextCycle: goals,
      managerComments: comments,
    }),
    onSuccess: () => {
      toast.success('Review submitted');
      queryClient.invalidateQueries({ queryKey: ['hr-performance-reviews-to-give'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit review'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4 my-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-foreground">Review: {review.employee?.firstName} {review.employee?.lastName}</h3>
            <p className="text-xs text-muted-foreground">{review.cycle?.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Overall Rating</label>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Strengths</label>
          <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2}
            className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm focus:outline-none resize-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Areas for Improvement</label>
          <textarea value={areas} onChange={(e) => setAreas(e.target.value)} rows={2}
            className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm focus:outline-none resize-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Goals for Next Cycle</label>
          <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={2}
            className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm focus:outline-none resize-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Additional Comments</label>
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2}
            className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm focus:outline-none resize-none" />
        </div>

        <button
          disabled={!rating || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {review.status === 'PENDING' ? 'Submit Review' : 'Update & Resubmit'}
        </button>
      </div>
    </div>
  );
}

function AcknowledgeReviewModal({ review, onClose }: { review: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [comments, setComments] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.acknowledgePerformanceReview(review.id, { employeeComments: comments }),
    onSuccess: () => {
      toast.success('Review acknowledged');
      queryClient.invalidateQueries({ queryKey: ['hr-performance-reviews-mine'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to acknowledge review'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4 my-8">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-foreground">{review.cycle?.name}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Overall Rating</label>
          <StarRating value={review.overallRating || 0} readOnly />
        </div>
        {review.strengths && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Strengths</label>
            <p className="text-sm text-foreground bg-muted dark:bg-card rounded-lg p-3">{review.strengths}</p>
          </div>
        )}
        {review.areasForImprovement && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Areas for Improvement</label>
            <p className="text-sm text-foreground bg-muted dark:bg-card rounded-lg p-3">{review.areasForImprovement}</p>
          </div>
        )}
        {review.goalsForNextCycle && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Goals for Next Cycle</label>
            <p className="text-sm text-foreground bg-muted dark:bg-card rounded-lg p-3">{review.goalsForNextCycle}</p>
          </div>
        )}
        {review.managerComments && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Manager Comments</label>
            <p className="text-sm text-foreground bg-muted dark:bg-card rounded-lg p-3">{review.managerComments}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Your Comments (optional)</label>
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3}
            placeholder="Anything you'd like to add before acknowledging..."
            className="w-full px-3 py-2 border rounded-lg bg-muted dark:bg-card text-sm focus:outline-none resize-none" />
        </div>

        <button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Acknowledge Review
        </button>
      </div>
    </div>
  );
}

export function PerformanceTab({ isAdmin, isManager }: { isAdmin: boolean; isManager: boolean }) {
  const queryClient = useQueryClient();
  const [showCreateCycle, setShowCreateCycle] = useState(false);
  const [submittingReview, setSubmittingReview] = useState<any>(null);
  const [acknowledgingReview, setAcknowledgingReview] = useState<any>(null);
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);

  const { data: cycles = [] } = useQuery({ queryKey: ['hr-performance-cycles'], queryFn: api.getReviewCycles });
  const { data: myReviews = [] } = useQuery({ queryKey: ['hr-performance-reviews-mine'], queryFn: api.getMyPerformanceReviews });
  const { data: reviewsToGive = [] } = useQuery({
    queryKey: ['hr-performance-reviews-to-give'],
    queryFn: api.getReviewsToGive,
    enabled: isManager,
  });
  const { data: expandedCycleReviews = [] } = useQuery({
    queryKey: ['hr-performance-cycle-reviews', expandedCycleId],
    queryFn: () => api.getCycleReviews(expandedCycleId as string),
    enabled: !!expandedCycleId && isManager,
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.activateReviewCycle(id),
    onSuccess: (res: any) => {
      toast.success(`Cycle activated — ${res.reviewsCreated} review(s) generated`);
      queryClient.invalidateQueries({ queryKey: ['hr-performance-cycles'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to activate cycle'),
  });
  const closeMutation = useMutation({
    mutationFn: (id: string) => api.closeReviewCycle(id),
    onSuccess: () => {
      toast.success('Cycle closed');
      queryClient.invalidateQueries({ queryKey: ['hr-performance-cycles'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to close cycle'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteReviewCycle(id),
    onSuccess: () => {
      toast.success('Cycle deleted');
      queryClient.invalidateQueries({ queryKey: ['hr-performance-cycles'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete cycle'),
  });

  return (
    <div className="space-y-8">
      {isAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Review Cycles</h3>
            <button
              onClick={() => setShowCreateCycle(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black text-primary-foreground bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
            >
              <Plus className="h-4 w-4" /> New Cycle
            </button>
          </div>
          {cycles.length === 0 ? (
            <div className="text-center py-8 bg-card border border-border rounded-2xl text-muted-foreground text-sm">
              No review cycles yet.
            </div>
          ) : (
            <div className="space-y-2">
              {cycles.map((cycle: any) => (
                <div key={cycle.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setExpandedCycleId(expandedCycleId === cycle.id ? null : cycle.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      {expandedCycleId === cycle.id ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{cycle.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(cycle.startDate).toLocaleDateString()} – {new Date(cycle.endDate).toLocaleDateString()} · {cycle._count?.reviews ?? 0} review(s)
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={cycle.status} styles={CYCLE_STATUS_STYLES} />
                      {cycle.status === 'DRAFT' && (
                        <>
                          <button onClick={() => activateMutation.mutate(cycle.id)} title="Activate" className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
                            <Play className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(cycle.id)} title="Delete" className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {cycle.status === 'ACTIVE' && (
                        <button onClick={() => closeMutation.mutate(cycle.id)} title="Close cycle" className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-muted">
                          <Square className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {expandedCycleId === cycle.id && (
                    <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/30">
                      {expandedCycleReviews.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No reviews visible to you for this cycle.</p>
                      ) : (
                        expandedCycleReviews.map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground">{r.employee?.firstName} {r.employee?.lastName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : 'No reviewer assigned'}</span>
                              <StatusBadge status={r.status} styles={REVIEW_STATUS_STYLES} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isManager && reviewsToGive.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-foreground">Reviews To Give</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviewsToGive.map((review: any) => (
              <div key={review.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-foreground">{review.employee?.firstName} {review.employee?.lastName}</p>
                    <p className="text-[11px] text-muted-foreground">{review.cycle?.name}</p>
                  </div>
                  <StatusBadge status={review.status} styles={REVIEW_STATUS_STYLES} />
                </div>
                <button
                  onClick={() => setSubmittingReview(review)}
                  disabled={review.status === 'ACKNOWLEDGED'}
                  className="w-full px-3 py-2 text-xs font-black rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
                >
                  {review.status === 'PENDING' ? 'Fill Out Review' : review.status === 'SUBMITTED' ? 'Edit Review' : 'Acknowledged'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">My Reviews</h3>
        {myReviews.length === 0 ? (
          <div className="text-center py-8 bg-card border border-border rounded-2xl text-muted-foreground text-sm">
            No performance reviews yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myReviews.map((review: any) => (
              <div key={review.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-foreground">{review.cycle?.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {review.reviewer ? `Reviewer: ${review.reviewer.firstName} ${review.reviewer.lastName}` : 'No reviewer assigned yet'}
                    </p>
                  </div>
                  <StatusBadge status={review.status} styles={REVIEW_STATUS_STYLES} />
                </div>
                {review.overallRating && <StarRating value={review.overallRating} readOnly />}
                {review.status === 'SUBMITTED' && (
                  <button
                    onClick={() => setAcknowledgingReview(review)}
                    className="w-full px-3 py-2 text-xs font-black rounded-xl bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Review & Acknowledge
                  </button>
                )}
                {review.status === 'PENDING' && (
                  <p className="text-[11px] text-muted-foreground italic">Waiting on your reviewer.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateCycle && <CreateCycleModal onClose={() => setShowCreateCycle(false)} />}
      {submittingReview && <SubmitReviewModal review={submittingReview} onClose={() => setSubmittingReview(null)} />}
      {acknowledgingReview && <AcknowledgeReviewModal review={acknowledgingReview} onClose={() => setAcknowledgingReview(null)} />}
    </div>
  );
}
