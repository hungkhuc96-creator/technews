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

  it('lọc bỏ tin deals, chỉ ghi tin thường', async () => {
    const dealXml = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
      <item><title>Best Prime Day deals on laptops</title><link>https://t/a</link><guid>a</guid><pubDate>Tue, 23 Jun 2026 04:00:00 GMT</pubDate></item>
      <item><title>Apple announces iOS 27</title><link>https://t/b</link><guid>b</guid><pubDate>Tue, 23 Jun 2026 04:00:00 GMT</pubDate></item>
      </channel></rss>`;
    const inserted: NormalizedPost[] = [];
    const result = await ingestPress(
      [{ name: 'T', feedUrl: 'https://t/feed' }],
      {
        fetchImpl: (async () => new Response(dealXml, { status: 200 })) as typeof fetch,
        upsert: async (posts) => { inserted.push(...posts); return posts.length; },
      },
    );
    expect(result.fetched).toBe(1);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].title).toBe('Apple announces iOS 27');
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
