import { describe, it, expect } from 'vitest';
import { pressHeat } from './heat';

describe('pressHeat', () => {
  it('= n_sources / (age + 2)^1.5', () => {
    // age = 0: 5 / 2^1.5 = 5 / 2.8284 ≈ 1.7678
    expect(pressHeat(5, 0)).toBeCloseTo(5 / Math.pow(2, 1.5), 4);
  });

  it('cùng số nguồn, tin cũ hơn thì nóng thấp hơn', () => {
    expect(pressHeat(5, 0)).toBeGreaterThan(pressHeat(5, 10));
  });

  it('cùng tuổi, nhiều nguồn hơn thì nóng cao hơn', () => {
    expect(pressHeat(10, 5)).toBeGreaterThan(pressHeat(2, 5));
  });
});
