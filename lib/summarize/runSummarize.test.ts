import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { upsertPosts } from '../db/posts';
import { runSummarize } from './runSummarize';

const client = createServiceClient();
let clusterId: string;
const URL = 'https://example.com/sum-1';

const fakeChat = async () =>
  '{"title":"Tiêu đề thử","summary":"Bản tóm tắt thử nghiệm.","bullets":["Ý một","Ý hai"]}';

describe('runSummarize', () => {
  beforeAll(async () => {
    await client.from('posts').delete().like('url', 'https://example.com/sum-%');
    await client.from('sources').delete().eq('name', 'Sum-Src');
    await client.from('clusters').delete().eq('topic', '__sum_test__');

    const { data: cl } = await client
      .from('clusters')
      .insert({ topic: '__sum_test__', n_sources: 1, post_count: 1, heat_score: 999, status: 'open' })
      .select('id')
      .single();
    clusterId = cl!.id;
    await upsertPosts(client, [{
      sourceType: 'press', sourceName: 'Sum-Src', externalId: 'sum1',
      title: 'A big tech event', text: 'details', url: URL,
      author: null, publishedAt: '2026-06-25T00:00:00.000Z', lang: null, metrics: {},
    }]);
    await client.from('posts').update({ cluster_id: clusterId }).eq('url', URL);
  });

  afterAll(async () => {
    await client.from('cluster_summaries').delete().eq('cluster_id', clusterId);
    await client.from('clusters').delete().eq('id', clusterId);
    await client.from('posts').delete().like('url', 'https://example.com/sum-%');
    await client.from('sources').delete().eq('name', 'Sum-Src');
  });

  it('tóm tắt cụm lên feed và lưu cluster_summaries', async () => {
    const r = await runSummarize(client, fakeChat, { limit: 1 });
    expect(r.summarized).toBeGreaterThanOrEqual(1);
    const { data } = await client
      .from('cluster_summaries').select('title_vi, summary_vi, bullets_vi').eq('cluster_id', clusterId).single();
    expect(data!.title_vi).toBe('Tiêu đề thử');
    expect(data!.summary_vi).toBe('Bản tóm tắt thử nghiệm.');
    expect(data!.bullets_vi).toEqual(['Ý một', 'Ý hai']);
  }, 60000);

  it('chạy lại không gọi AI nữa nếu cụm không đổi (cache theo input_hash)', async () => {
    const r = await runSummarize(client, fakeChat, { limit: 1 });
    expect(r.skipped).toBeGreaterThanOrEqual(1);
  }, 60000);
});
