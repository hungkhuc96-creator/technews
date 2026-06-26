import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ingestYoutube } from './ingestYoutube';
import type { NormalizedPost } from '../types';

const ytXml = readFileSync(
  fileURLToPath(new URL('./__fixtures__/youtube.xml', import.meta.url)),
  'utf-8',
);

// fetch giả: URL trang kênh trả HTML chứa channelId; URL feed trả fixture.
const fakeFetch = (async (url: string) => {
  if (url.includes('/feeds/videos.xml')) return new Response(ytXml, { status: 200 });
  return new Response('... "channelId":"UCfake123" ...', { status: 200 });
}) as typeof fetch;

describe('ingestYoutube', () => {
  it('giải channelId → đọc RSS → upsert, trả thống kê', async () => {
    const inserted: NormalizedPost[] = [];
    const result = await ingestYoutube(
      [{ name: 'MKBHD', channelUrl: 'https://www.youtube.com/@mkbhd' }],
      { fetchImpl: fakeFetch, upsert: async (p) => { inserted.push(...p); return p.length; } },
    );
    expect(result.fetched).toBe(2);
    expect(result.inserted).toBe(2);
    expect(inserted[0].sourceType).toBe('youtube');
  });

  it('kênh không giải được channelId thì bỏ qua (degrade)', async () => {
    const noId = (async () => new Response('không có id', { status: 200 })) as typeof fetch;
    const result = await ingestYoutube(
      [{ name: 'X', channelUrl: 'https://www.youtube.com/@x' }],
      { fetchImpl: noId, upsert: async (p) => p.length },
    );
    expect(result.failedSources).toEqual(['X']);
    expect(result.inserted).toBe(0);
  });
});
