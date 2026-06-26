import { describe, it, expect } from 'vitest';
import { rankCandidates } from './rank';

describe('rankCandidates', () => {
  it('chuẩn hóa theo bucket: top mỗi loại đứng ngang nhau', () => {
    const out = rankCandidates(
      [
        { item: 'press-top', bucket: 'press', rawHeat: 0.05 },   // top press → 1.0
        { item: 'press-low', bucket: 'press', rawHeat: 0.01 },   // 0.2
        { item: 'yt-top', bucket: 'youtube', rawHeat: 3.0 },     // top youtube → 1.0
        { item: 'yt-low', bucket: 'youtube', rawHeat: 1.5 },     // 0.5
      ],
      10,
    );
    expect(out.slice(0, 2).sort()).toEqual(['press-top', 'yt-top']);
    expect(out[2]).toBe('yt-low');
    expect(out[3]).toBe('press-low');
  });

  it('cắt theo limit', () => {
    const out = rankCandidates(
      [1, 2, 3].map((n) => ({ item: n, bucket: 'a', rawHeat: n })),
      2,
    );
    expect(out).toEqual([3, 2]);
  });
});
