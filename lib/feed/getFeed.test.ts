import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { upsertPosts } from '../db/posts';
import { getFeed } from './getFeed';

const client = createServiceClient();
let hotId: string;
let coldId: string;

describe('getFeed', () => {
  beforeAll(async () => {
    await client.from('posts').delete().like('url', 'https://example.com/%');
    await client.from('sources').delete().like('name', 'F-%');
    await client.from('clusters').delete().eq('topic', '__feed_test__');

    await upsertPosts(client, [
      {
        sourceType: 'press', sourceName: 'F-One', externalId: 'f1',
        title: 'Tin nóng test', text: '', url: 'https://example.com/f1',
        author: null, publishedAt: '2026-06-24T00:00:00.000Z', lang: null, metrics: {},
      },
    ]);
    const { data: rep } = await client
      .from('posts').select('id').eq('url', 'https://example.com/f1').single();

    const hot = await client.from('clusters').insert({
      topic: '__feed_test__', n_sources: 9, post_count: 9, heat_score: 5,
      status: 'open', representative_post_id: rep!.id,
    }).select('id').single();
    hotId = hot.data!.id;

    const cold = await client.from('clusters').insert({
      topic: '__feed_test__', n_sources: 1, post_count: 1, heat_score: 0.1,
      status: 'open', representative_post_id: rep!.id,
    }).select('id').single();
    coldId = cold.data!.id;

    await client.from('cluster_summaries').upsert({
      cluster_id: hotId,
      summary_vi: 'Tóm tắt nóng.',
      bullets_vi: ['Điểm 1', 'Điểm 2'],
      input_hash: 'h',
      generated_at: new Date().toISOString(),
    }, { onConflict: 'cluster_id' });
  });

  afterAll(async () => {
    await client.from('cluster_summaries').delete().in('cluster_id', [hotId, coldId]);
    await client.from('clusters').delete().in('id', [hotId, coldId]);
    await client.from('posts').delete().like('url', 'https://example.com/%');
    await client.from('sources').delete().like('name', 'F-%');
  });

  it('trả các cụm xếp theo độ nóng giảm dần, kèm tin đại diện', async () => {
    const items = await getFeed(client, 30);
    const idx = items.findIndex((i) => i.clusterId === hotId);
    const idxCold = items.findIndex((i) => i.clusterId === coldId);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(idxCold);          // cụm nóng đứng trước cụm nguội
    expect(items[idx].title).toBe('Tin nóng test');
    expect(items[idx].sourceName).toBe('F-One');
    expect(items[idx].nSources).toBe(9);
    expect(items[idx].summary).toBe('Tóm tắt nóng.');
    expect(items[idx].bullets).toEqual(['Điểm 1', 'Điểm 2']);
  });
});
