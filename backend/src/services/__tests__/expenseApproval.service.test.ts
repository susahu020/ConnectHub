import { requiresSecondApproval } from '../expenseApproval.service';

describe('requiresSecondApproval', () => {
  it('is always false when the threshold is null (feature disabled)', () => {
    expect(requiresSecondApproval(1000000, null)).toBe(false);
  });

  it('is false for an amount under the threshold', () => {
    expect(requiresSecondApproval(50, 100)).toBe(false);
  });

  it('is false for an amount exactly at the threshold (strictly-greater-than semantics)', () => {
    expect(requiresSecondApproval(100, 100)).toBe(false);
  });

  it('is true for an amount over the threshold', () => {
    expect(requiresSecondApproval(100.01, 100)).toBe(true);
  });

  it('is false for a zero threshold and a zero amount', () => {
    expect(requiresSecondApproval(0, 0)).toBe(false);
  });

  it('is true for any positive amount when the threshold is zero', () => {
    expect(requiresSecondApproval(0.01, 0)).toBe(true);
  });
});
