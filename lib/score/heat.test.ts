import { describe, it, expect } from 'vitest';
import { pressHeat } from './heat';

describe('pressHeat', () => {
  it('= n_sources / (age + 2)^1.5', () => {
    expect(pressHeat(5, 0)).toBeCloseTo(5 / Math.pow(2, 1.5), 4);
  });

  it('cùng số nguồn, tin cũ hơn thì nóng thấp hơn', () => {
    expect(pressHeat(5, 0)).toBeGreaterThan(pressHeat(5, 10));
  });

  it('cùng tuổi, nhiều nguồn hơn thì nóng cao hơn (điểm cộng độ phủ)', () => {
    expect(pressHeat(10, 5)).toBeGreaterThan(pressHeat(2, 5));
  });

  it('ƯU TIÊN ĐỘ MỚI: tin mới 1 nguồn vượt tin cũ (2 ngày) dù 7 nguồn', () => {
    expect(pressHeat(1, 0)).toBeGreaterThan(pressHeat(7, 48));
  });
});
