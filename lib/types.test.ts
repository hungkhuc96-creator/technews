import { describe, it, expect } from 'vitest';
import type { NormalizedPost } from './types';
import { isSourceType } from './types';

describe('types', () => {
  it('isSourceType nhận đúng 5 loại nguồn', () => {
    expect(isSourceType('press')).toBe(true);
    expect(isSourceType('youtube')).toBe(true);
    expect(isSourceType('reddit')).toBe(true);
    expect(isSourceType('x')).toBe(true);
    expect(isSourceType('tiktok')).toBe(true);
    expect(isSourceType('blog')).toBe(false);
  });

  it('NormalizedPost dựng được object hợp lệ', () => {
    const p: NormalizedPost = {
      sourceType: 'press',
      sourceName: 'The Verge',
      externalId: 'abc',
      title: 'Hello',
      text: 'world',
      url: 'https://x.com/a',
      author: null,
      publishedAt: '2026-06-24T00:00:00.000Z',
      lang: null,
      metrics: {},
    };
    expect(p.sourceType).toBe('press');
  });
});
