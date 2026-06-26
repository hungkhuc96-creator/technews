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

  it('đa dạng: chen bucket thiểu số dù điểm thấp (không quá maxConsecutive liên tiếp)', () => {
    const cands = [
      ...['p0', 'p1', 'p2', 'p3', 'p4'].map((s, i) => ({ item: s, bucket: 'press', rawHeat: 10 - i })),
      { item: 'y0', bucket: 'youtube', rawHeat: 10 }, // top youtube → chuẩn hóa 1.0
      { item: 'y1', bucket: 'youtube', rawHeat: 1 },  // youtube thứ 2 điểm thấp → 0.1
    ];
    // Không đa dạng: y1 (điểm thấp nhất) sẽ ở cuối (index 6).
    const out = rankCandidates(cands, 7, 2); // tối đa 2 cùng loại liên tiếp
    expect(out.indexOf('y1')).toBeLessThan(6); // luật đa dạng phải kéo y1 lên
  });
});
