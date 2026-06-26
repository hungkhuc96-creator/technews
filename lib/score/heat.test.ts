import { describe, it, expect } from 'vitest';
import { pressHeat, engagementHeat, recencyHeat } from './heat';

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

describe('engagementHeat', () => {
  it('= log10(1 + metric) / (age + 2)^1.5', () => {
    expect(engagementHeat(999, 0)).toBeCloseTo(Math.log10(1000) / Math.pow(2, 1.5), 5);
  });
  it('nhiều engagement hơn → nóng hơn (cùng tuổi)', () => {
    expect(engagementHeat(10000, 5)).toBeGreaterThan(engagementHeat(100, 5));
  });
  it('cũ hơn → nguội hơn', () => {
    expect(engagementHeat(1000, 0)).toBeGreaterThan(engagementHeat(1000, 20));
  });
});

describe('recencyHeat', () => {
  it('= 1 / (age + 2)^1.5; mới hơn nóng hơn', () => {
    expect(recencyHeat(0)).toBeCloseTo(1 / Math.pow(2, 1.5), 5);
    expect(recencyHeat(0)).toBeGreaterThan(recencyHeat(10));
  });
});
