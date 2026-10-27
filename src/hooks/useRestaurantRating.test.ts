import { describe, it, expect } from 'vitest';
import { computeRating } from './useRestaurantRating';

describe('computeRating', () => {
  it('returns null average and zero count when there are no reviews', () => {
    expect(computeRating([])).toEqual({ average: null, count: 0 });
  });

  it('calculates the average rounded to two decimals', () => {
    // 254x5 + 22x4 + 11x3 + 5x2 + 38x1 = 1439 over 330 reviews
    const ratings = [
      ...Array(254).fill(5),
      ...Array(22).fill(4),
      ...Array(11).fill(3),
      ...Array(5).fill(2),
      ...Array(38).fill(1),
    ];
    expect(computeRating(ratings)).toEqual({ average: 4.36, count: 330 });
  });

  it('ignores out-of-range values', () => {
    expect(computeRating([5, 0, 6, NaN])).toEqual({ average: 5, count: 1 });
  });
});
