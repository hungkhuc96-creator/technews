import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ingestPress } from './ingestPress';
import type { NormalizedPost } from '../types';

const xml = readFileSync(
  fileURLToPath(new URL('./__fixtures__/verge.xml', import.meta.url)),
  'utf-8',
);

describe('ingestPress', () => {
  it('fetch + parse + upsert cho mọi nguồn, trả về thống kê', async () => {
    const inserted: NormalizedPost[] = [];
    const result = await ingestPress(
      [{ name: 'The Verge', feedUrl: 'https://verge/feed' }],
      {
        fetchImpl: (async () => new Response(xml, { status: 200 })) as typeof fetch,
        upsert: async (posts) => {
          inserted.push(...posts);
          return posts.length;
        },
      },
    );
    expect(result.fetched).toBe(2);
    expect(result.inserted).toBe(2);
    expect(result.failedSources).toEqual([]);
    expect(inserted[0].sourceName).toBe('The Verge');
  });

  it('một nguồn lỗi thì bỏ qua, không làm hỏng toàn bộ (degrade)', async () => {
    const result = await ingestPress(
      [
        { name: 'Hỏng', feedUrl: 'https://bad/feed' },
        { name: 'The Verge', feedUrl: 'https://verge/feed' },
      ],
      {
        fetchImpl: (async (url: string) =>
          url.includes('bad')
            ? new Response('err', { status: 500 })
            : new Response(xml, { status: 200 })) as typeof fetch,
        upsert: async (posts) => posts.length,
      },
    );
    expect(result.failedSources).toEqual(['Hỏng']);
    expect(result.inserted).toBe(2);
  });
});
