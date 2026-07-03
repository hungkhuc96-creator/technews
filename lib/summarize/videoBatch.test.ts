import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { upsertPosts } from '../db/posts';
import { summarizeRecentVideos, fetchDurationSec } from './videoBatch';

describe('fetchDurationSec', () => {
  it('rút lengthSeconds từ HTML trang watch', async () => {
    const fake = (async () => new Response('..."lengthSeconds":"754"...', { status: 200 })) as typeof fetch;
    expect(await fetchDurationSec('https://youtube.com/watch?v=x', fake)).toBe(754);
  });
  it('không có / lỗi mạng → null (an toàn: để lazy)', async () => {
    const none = (async () => new Response('no data', { status: 200 })) as typeof fetch;
    expect(await fetchDurationSec('https://youtube.com/watch?v=x', none)).toBeNull();
    const boom = (async () => { throw new Error('mạng sập'); }) as unknown as typeof fetch;
    expect(await fetchDurationSec('https://youtube.com/watch?v=x', boom)).toBeNull();
  });
});

describe('summarizeRecentVideos', () => {
  const client = createServiceClient();
  const recent = new Date(Date.now() - 3 * 3600e3).toISOString();

  beforeAll(async () => {
    await client.from('posts').delete().like('url', '%vbatch_%');
    await client.from('sources').delete().eq('name', 'VBatch-Src');
    await upsertPosts(client, [
      { sourceType: 'youtube', sourceName: 'VBatch-Src', externalId: 'vbatch_short',
        title: 'Video ngắn', text: '', url: 'https://www.youtube.com/watch?v=vbatch_short',
        author: null, publishedAt: recent, lang: null, metrics: {} },
      { sourceType: 'youtube', sourceName: 'VBatch-Src', externalId: 'vbatch_long',
        title: 'Podcast dài', text: '', url: 'https://www.youtube.com/watch?v=vbatch_long',
        author: null, publishedAt: recent, lang: null, metrics: {} },
      { sourceType: 'youtube', sourceName: 'VBatch-Src', externalId: 'vbatch_unknown',
        title: 'Không đo được độ dài', text: '', url: 'https://www.youtube.com/watch?v=vbatch_unknown',
        author: null, publishedAt: recent, lang: null, metrics: {} },
    ]);
  });

  afterAll(async () => {
    await client.from('posts').delete().like('url', '%vbatch_%');
    await client.from('sources').delete().eq('name', 'VBatch-Src');
  });

  it('tóm tắt video ngắn + video KHÔNG ĐO ĐƯỢC độ dài, chỉ BỎ podcast biết chắc dài', async () => {
    let geminiCalls = 0;
    const r = await summarizeRecentVideos(client, {
      videoChat: async () => { geminiCalls++; return '- Ý chính'; },
      // long → 66' (bỏ); unknown → null (cứ thử); còn lại → 5' (làm)
      getDurationSec: async (url) => (url.includes('long') ? 4000 : url.includes('unknown') ? null : 300),
      maxDurationSec: 1200,
      // BẮT BUỘC: chỉ đụng post test — thiếu filter này test sẽ cache chuỗi giả
      // vào video THẬT trên production (đã xảy ra, phải dọn tay).
      urlPrefix: 'https://www.youtube.com/watch?v=vbatch_',
    });
    expect(r.checked).toBe(3);
    expect(r.summarized).toBe(2);      // ngắn + không-đo-được
    expect(r.skippedLong).toBe(1);     // chỉ podcast biết chắc dài
    expect(geminiCalls).toBe(2);

    const { data } = await client
      .from('posts').select('url, video_summary_vi').like('url', '%vbatch_%').order('url');
    const byUrl = new Map(data!.map((d) => [d.url, d.video_summary_vi]));
    expect(byUrl.get('https://www.youtube.com/watch?v=vbatch_long')).toBeNull();         // dài → bỏ
    expect(byUrl.get('https://www.youtube.com/watch?v=vbatch_short')).toBe('- Ý chính');  // ngắn → có
    expect(byUrl.get('https://www.youtube.com/watch?v=vbatch_unknown')).toBe('- Ý chính'); // không đo được → vẫn có
  }, 60000);
});
