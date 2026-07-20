import { describe, it, expect } from 'vitest';
import { isThrottled } from './throttle';

const now = new Date('2026-07-20T12:00:00.000Z');

describe('isThrottled', () => {
  it('chưa từng chạy (null) → KHÔNG chặn', () => {
    expect(isThrottled(null, now, 28)).toBe(false);
  });

  it('mới chạy trong cửa sổ → CHẶN (bỏ qua)', () => {
    expect(isThrottled('2026-07-20T11:45:00.000Z', now, 28)).toBe(true); // 15 phút trước
    expect(isThrottled('2026-07-20T11:35:00.000Z', now, 28)).toBe(true); // 25 phút trước
  });

  it('đã quá cửa sổ → KHÔNG chặn (cho chạy)', () => {
    expect(isThrottled('2026-07-20T11:30:00.000Z', now, 28)).toBe(false); // 30 phút trước
    expect(isThrottled('2026-07-20T10:00:00.000Z', now, 28)).toBe(false); // 2 tiếng trước
  });

  it('đúng biên (elapsed == minMinutes) → cho chạy', () => {
    expect(isThrottled('2026-07-20T11:32:00.000Z', now, 28)).toBe(false); // đúng 28 phút
  });
});
