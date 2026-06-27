import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ingestReddit } from './ingestReddit';
import type { NormalizedPost } from '../types';

const redditJson = readFileSync(
  fileURLToPath(new URL('./__fixtures__/reddit.json', import.meta.url)),
  'utf-8',
);

const okFetch = (async () => new Response(redditJson, { status: 200 })) as typeof fetch;

describe('ingestReddit', () => {
  it('đọc hot.json → chuẩn hóa → upsert, trả thống kê', async () => {
    const inserted: NormalizedPost[] = [];
    const result = await ingestReddit(
      [{ name: 'r/technology', subreddit: 'technology' }],
      { token: 'tok', fetchImpl: okFetch, upsert: async (p) => { inserted.push(...p); return p.length; } },
    );
    expect(result.fetched).toBe(2); // bỏ bài ghim
    expect(result.inserted).toBe(2);
    expect(inserted[0].sourceType).toBe('reddit');
  });

  it('sub lỗi thì bỏ qua (degrade), không làm hỏng cả mẻ', async () => {
    const failFetch = (async () => new Response('nope', { status: 429 })) as typeof fetch;
    const result = await ingestReddit(
      [{ name: 'r/x', subreddit: 'x' }],
      { token: 'tok', fetchImpl: failFetch, upsert: async (p) => p.length },
    );
    expect(result.failedSources).toEqual(['r/x']);
    expect(result.inserted).toBe(0);
  });
});
