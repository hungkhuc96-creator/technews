import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { upsertPosts } from '../db/posts';
import { buildDetailPrompt, detailSummaryById } from './detailSummary';

describe('buildDetailPrompt', () => {
  it('chứa nội dung bài, yêu cầu tiếng Việt 8-12 câu, không suy diễn', () => {
    const p = buildDetailPrompt([
      { title: 'OpenAI launches GPT-6', text: 'Details here.', sourceName: 'The Verge' },
    ]);
    expect(p).toContain('OpenAI launches GPT-6');
    expect(p).toContain('TIẾNG VIỆT');
    expect(p).toContain('8-12 câu');
    expect(p).toContain('không suy diễn');
  });
});

describe('detailSummaryById', () => {
  const client = createServiceClient();
  let clusterId: string;
  const URL = 'https://example.com/detail-1';

  beforeAll(async () => {
    await client.from('posts').delete().like('url', 'https://example.com/detail-%');
    await client.from('sources').delete().eq('name', 'Detail-Src');
    await client.from('clusters').delete().eq('topic', '__detail_test__');
    const { data: cl } = await client
      .from('clusters')
      .insert({ topic: '__detail_test__', n_sources: 1, post_count: 1, heat_score: 1, status: 'open' })
      .select('id')
      .single();
    clusterId = cl!.id;
    await upsertPosts(client, [{
      sourceType: 'press', sourceName: 'Detail-Src', externalId: 'dt1',
      title: 'A big tech event', text: 'many details', url: URL,
      author: null, publishedAt: '2026-07-01T00:00:00.000Z', lang: null, metrics: {},
    }]);
    await client.from('posts').update({ cluster_id: clusterId }).eq('url', URL);
  });

  afterAll(async () => {
    await client.from('cluster_summaries').delete().eq('cluster_id', clusterId);
    await client.from('clusters').delete().eq('id', clusterId);
    await client.from('posts').delete().like('url', 'https://example.com/detail-%');
    await client.from('sources').delete().eq('name', 'Detail-Src');
  });

  it('tạo bản chi tiết, lưu cache; lần 2 KHÔNG gọi AI nữa', async () => {
    let calls = 0;
    const fakeChat = async () => { calls++; return 'Đoạn một chi tiết.\n\nĐoạn hai chi tiết.'; };

    const first = await detailSummaryById(client, fakeChat, clusterId);
    expect(first).toContain('Đoạn một chi tiết.');
    expect(calls).toBe(1);

    const second = await detailSummaryById(client, fakeChat, clusterId);
    expect(second).toBe(first); // trả từ cache
    expect(calls).toBe(1);      // AI không bị gọi lại

    // Không phá dòng tóm tắt: placeholder summary_vi vẫn là '' (chưa có tóm tắt ngắn)
    const { data } = await client
      .from('cluster_summaries').select('summary_vi, detail_vi').eq('cluster_id', clusterId).single();
    expect(data!.detail_vi).toContain('Đoạn hai chi tiết.');
    expect(data!.summary_vi).toBe('');
  }, 60000);

  it('cụm không tồn tại → null', async () => {
    const r = await detailSummaryById(client, async () => 'x', '00000000-0000-0000-0000-000000000000');
    expect(r).toBeNull();
  }, 60000);
});
