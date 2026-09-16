import { validateReviewSubmission, validateCycleDates } from '../performanceReview.service';

describe('validateReviewSubmission', () => {
  it('accepts a minimal valid submission (rating only)', () => {
    const result = validateReviewSubmission({ overallRating: 4 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.overallRating).toBe(4);
      expect(result.data.strengths).toBeNull();
    }
  });

  it('accepts a fully-populated submission', () => {
    const result = validateReviewSubmission({
      overallRating: 5,
      strengths: 'Great communicator',
      areasForImprovement: 'Delegation',
      goalsForNextCycle: 'Lead a project',
      managerComments: 'Keep it up',
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toEqual({
        overallRating: 5,
        strengths: 'Great communicator',
        areasForImprovement: 'Delegation',
        goalsForNextCycle: 'Lead a project',
        managerComments: 'Keep it up',
      });
    }
  });

  it.each([0, 6, -1, 3.5])('rejects an out-of-range or non-integer rating (%s)', (rating) => {
    const result = validateReviewSubmission({ overallRating: rating });
    expect(result.valid).toBe(false);
  });

  it('rejects a missing rating', () => {
    const result = validateReviewSubmission({ overallRating: undefined });
    expect(result.valid).toBe(false);
  });

  it('rejects a non-string text field', () => {
    const result = validateReviewSubmission({ overallRating: 3, strengths: 12345 as any });
    expect(result.valid).toBe(false);
  });

  it('rejects an overlong text field', () => {
    const result = validateReviewSubmission({ overallRating: 3, strengths: 'a'.repeat(5001) });
    expect(result.valid).toBe(false);
  });

  it('treats an empty string field as null rather than rejecting it', () => {
    const result = validateReviewSubmission({ overallRating: 3, strengths: '' });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.strengths).toBeNull();
  });
});

describe('validateCycleDates', () => {
  it('accepts endDate after startDate', () => {
    const result = validateCycleDates(new Date('2026-01-01'), new Date('2026-06-30'));
    expect(result.valid).toBe(true);
  });

  it('rejects endDate equal to startDate', () => {
    const d = new Date('2026-01-01');
    const result = validateCycleDates(d, new Date(d));
    expect(result.valid).toBe(false);
  });

  it('rejects endDate before startDate', () => {
    const result = validateCycleDates(new Date('2026-06-30'), new Date('2026-01-01'));
    expect(result.valid).toBe(false);
  });

  it('rejects invalid dates', () => {
    const result = validateCycleDates(new Date('not a date'), new Date('2026-01-01'));
    expect(result.valid).toBe(false);
  });
});
