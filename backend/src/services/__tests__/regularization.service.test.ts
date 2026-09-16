import { validateRegularizationRequest } from '../regularization.service';

const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
};

describe('validateRegularizationRequest', () => {
  it('accepts a valid request correcting an existing log (clock-out only)', () => {
    const result = validateRegularizationRequest(
      { date: yesterday(), requestedClockOut: yesterday(), reason: 'Forgot to clock out, left at 6pm' },
      true
    );
    expect(result.valid).toBe(true);
  });

  it('accepts a valid request creating a new log from scratch', () => {
    const result = validateRegularizationRequest(
      { date: yesterday(), requestedClockIn: yesterday(), reason: 'System was down, worked from home' },
      false
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a missing reason', () => {
    const result = validateRegularizationRequest({ date: yesterday(), requestedClockIn: yesterday(), reason: '' }, false);
    expect(result.valid).toBe(false);
  });

  it('rejects an overlong reason', () => {
    const result = validateRegularizationRequest(
      { date: yesterday(), requestedClockIn: yesterday(), reason: 'a'.repeat(1001) },
      false
    );
    expect(result.valid).toBe(false);
  });

  it('rejects a missing date', () => {
    const result = validateRegularizationRequest({ requestedClockIn: yesterday(), reason: 'test' } as any, false);
    expect(result.valid).toBe(false);
  });

  it('rejects an invalid date', () => {
    const result = validateRegularizationRequest({ date: 'not-a-date', requestedClockIn: yesterday(), reason: 'test' }, false);
    expect(result.valid).toBe(false);
  });

  it('rejects a future date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateRegularizationRequest({ date: tomorrow.toISOString(), requestedClockIn: yesterday(), reason: 'test' }, false);
    expect(result.valid).toBe(false);
  });

  it('rejects when neither requestedClockIn nor requestedClockOut is provided', () => {
    const result = validateRegularizationRequest({ date: yesterday(), reason: 'test' }, true);
    expect(result.valid).toBe(false);
  });

  it('rejects creating a new log without a requestedClockIn', () => {
    const result = validateRegularizationRequest({ date: yesterday(), requestedClockOut: yesterday(), reason: 'test' }, false);
    expect(result.valid).toBe(false);
  });

  it('allows correcting an existing log with only requestedClockOut (no clock-in needed)', () => {
    const result = validateRegularizationRequest({ date: yesterday(), requestedClockOut: yesterday(), reason: 'test' }, true);
    expect(result.valid).toBe(true);
  });

  it('rejects requestedClockOut before requestedClockIn', () => {
    const base = new Date();
    const early = new Date(base.getTime() - 60 * 60 * 1000).toISOString();
    const late = new Date(base.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const result = validateRegularizationRequest({ date: yesterday(), requestedClockIn: early, requestedClockOut: late, reason: 'test' }, true);
    expect(result.valid).toBe(false);
  });

  it('rejects a non-string time field', () => {
    const result = validateRegularizationRequest({ date: yesterday(), requestedClockIn: 12345 as any, reason: 'test' }, false);
    expect(result.valid).toBe(false);
  });
});
