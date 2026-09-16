// ==========================================
// EXPENSE TWO-TIER APPROVAL
// ==========================================
// Previously every expense claim was single-approval regardless of size —
// a $50 lunch and a $50,000 equipment purchase went through the exact same
// one-click manager sign-off. This adds an amount-based second tier: above
// a configurable threshold, a claim needs a second, different Admin's
// approval before it's finalized. See hr.controller.ts's
// updateExpenseStatus for the actual state-machine transition
// (PENDING -> PENDING_SECOND_APPROVAL -> APPROVED) that uses this.

/**
 * Null threshold means the feature is off (the default) — every claim
 * stays single-approval. Otherwise strictly-greater-than, so a claim
 * exactly at the threshold does NOT require a second approval (the
 * threshold reads as "anything over $X", not "$X and up").
 */
export const requiresSecondApproval = (amount: number, threshold: number | null): boolean => {
  if (threshold === null || threshold === undefined) return false;
  return amount > threshold;
};
