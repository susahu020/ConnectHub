jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: { findMany: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('../notification.service', () => ({
  createNotification: jest.fn(),
}));

import { isProbationEndingSoon } from '../probation.service';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe('isProbationEndingSoon', () => {
  const today = day(2026, 6, 15);

  it('is true when the end date is today', () => {
    expect(isProbationEndingSoon(day(2026, 6, 15), today, 7)).toBe(true);
  });

  it('is true when the end date is exactly at the window boundary', () => {
    expect(isProbationEndingSoon(day(2026, 6, 22), today, 7)).toBe(true);
  });

  it('is false when the end date is one day past the window boundary', () => {
    expect(isProbationEndingSoon(day(2026, 6, 23), today, 7)).toBe(false);
  });

  it('is false when the end date is in the past', () => {
    expect(isProbationEndingSoon(day(2026, 6, 14), today, 7)).toBe(false);
  });

  it('is false when the end date is far in the future', () => {
    expect(isProbationEndingSoon(day(2026, 12, 1), today, 7)).toBe(false);
  });

  it('ignores time-of-day when comparing (day-level granularity)', () => {
    const endWithTime = new Date(2026, 5, 20, 23, 59, 59);
    const referenceWithTime = new Date(2026, 5, 15, 0, 0, 1);
    expect(isProbationEndingSoon(endWithTime, referenceWithTime, 7)).toBe(true);
  });

  it('respects a custom window size', () => {
    expect(isProbationEndingSoon(day(2026, 6, 18), today, 2)).toBe(false);
    expect(isProbationEndingSoon(day(2026, 6, 18), today, 3)).toBe(true);
  });
});
