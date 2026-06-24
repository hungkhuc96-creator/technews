import { describe, it, expect } from 'vitest';
import { relativeTime, sourceLabel } from './format';

const now = new Date('2026-06-24T12:00:00.000Z');

describe('relativeTime', () => {
  it('dưới 1 phút → "vừa xong"', () => {
    expect(relativeTime('2026-06-24T11:59:30.000Z', now)).toBe('vừa xong');
  });
  it('phút', () => {
    expect(relativeTime('2026-06-24T11:45:00.000Z', now)).toBe('15 phút trước');
  });
  it('giờ', () => {
    expect(relativeTime('2026-06-24T09:00:00.000Z', now)).toBe('3 giờ trước');
  });
  it('ngày', () => {
    expect(relativeTime('2026-06-22T12:00:00.000Z', now)).toBe('2 ngày trước');
  });
});

describe('sourceLabel', () => {
  it('1 nguồn', () => {
    expect(sourceLabel(1)).toBe('1 nguồn');
  });
  it('nhiều nguồn', () => {
    expect(sourceLabel(7)).toBe('7 nguồn đưa tin');
  });
});
