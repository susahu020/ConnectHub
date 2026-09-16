// ==========================================
// PERFORMANCE REVIEW VALIDATION
// ==========================================
// Most of the performance-review feature is straightforward CRUD (see
// performance.controller.ts), but the one piece of actual business logic —
// what counts as a valid review submission — is pulled out here so it's
// pure, testable, and shared between the create and update code paths
// instead of duplicated inline in the controller.

export interface ReviewSubmissionInput {
  overallRating: unknown;
  strengths?: unknown;
  areasForImprovement?: unknown;
  goalsForNextCycle?: unknown;
  managerComments?: unknown;
}

export interface ValidatedReviewSubmission {
  overallRating: number;
  strengths: string | null;
  areasForImprovement: string | null;
  goalsForNextCycle: string | null;
  managerComments: string | null;
}

const MAX_FIELD_LENGTH = 5000;

const sanitizeOptionalText = (value: unknown, fieldName: string): { error?: string; value?: string | null } => {
  if (value === undefined || value === null || value === '') return { value: null };
  if (typeof value !== 'string') return { error: `${fieldName} must be text.` };
  if (value.length > MAX_FIELD_LENGTH) return { error: `${fieldName} must be under ${MAX_FIELD_LENGTH} characters.` };
  return { value };
};

/**
 * Validates a reviewer's submission for one PerformanceReview. A rating is
 * mandatory (a review with no rating at all isn't really a completed
 * review); every text field is optional but length-capped. Pure/DB-free —
 * performance.controller.ts calls this before writing to the DB.
 */
export const validateReviewSubmission = (
  input: ReviewSubmissionInput
): { valid: true; data: ValidatedReviewSubmission } | { valid: false; error: string } => {
  const rating = input.overallRating;
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { valid: false, error: 'overallRating is required and must be a whole number from 1 to 5.' };
  }

  const strengths = sanitizeOptionalText(input.strengths, 'strengths');
  if (strengths.error) return { valid: false, error: strengths.error };
  const areas = sanitizeOptionalText(input.areasForImprovement, 'areasForImprovement');
  if (areas.error) return { valid: false, error: areas.error };
  const goals = sanitizeOptionalText(input.goalsForNextCycle, 'goalsForNextCycle');
  if (goals.error) return { valid: false, error: goals.error };
  const comments = sanitizeOptionalText(input.managerComments, 'managerComments');
  if (comments.error) return { valid: false, error: comments.error };

  return {
    valid: true,
    data: {
      overallRating: rating,
      strengths: strengths.value ?? null,
      areasForImprovement: areas.value ?? null,
      goalsForNextCycle: goals.value ?? null,
      managerComments: comments.value ?? null,
    },
  };
};

/**
 * Cycle date validation shared by create/update — endDate must be strictly
 * after startDate. Kept here rather than relying on the DB, since Prisma
 * has no built-in cross-field constraint for this.
 */
export const validateCycleDates = (startDate: Date, endDate: Date): { valid: boolean; error?: string } => {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { valid: false, error: 'startDate and endDate must be valid dates.' };
  }
  if (endDate.getTime() <= startDate.getTime()) {
    return { valid: false, error: 'endDate must be after startDate.' };
  }
  return { valid: true };
};
