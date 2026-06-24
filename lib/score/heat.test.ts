import { describe, it, expect } from 'vitest';
import { pressHeat } from './heat';

describe('pressHeat', () => {
  it('= n_sources^2 / (age + 2)^1.2', () => {
    expect(pressHeat(5, 0)).toBeCloseTo(25 / Math.pow(2, 1.2), 4);
  });

  it('cùng số nguồn, tin cũ hơn thì nóng thấp hơn', () => {
    expect(pressHeat(5, 0)).toBeGreaterThan(pressHeat(5, 10));
  });

  it('cùng tuổi, nhiều nguồn hơn thì nóng cao hơn', () => {
    expect(pressHeat(10, 5)).toBeGreaterThan(pressHeat(2, 5));
  });

  it('cụm nhiều nguồn (dù cũ hơn) vượt tin mới chỉ 1 nguồn', () => {
    expect(pressHeat(7, 24)).toBeGreaterThan(pressHeat(1, 0));
  });
});
