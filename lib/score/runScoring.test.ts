import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { upsertPosts } from '../db/posts';
import { runScoring } from './runScoring';
import { pressHeat } from './heat';

const client = createServiceClient();
let clusterId: string;
const FIXED_NOW = new Date('2026-06-24T10:00:00.000Z');
const URL = 'https://example.com/score-fresh';

describe('runScoring', () => {
  beforeAll(async () => {
    await client.from('posts').delete().like('url', 'https://example.com/score-%');
    await client.from('sources').delete().eq('name', 'S-Score');
    // Cụm "bắt đầu" 48h trước (first_seen cũ)...
    const old = new Date(FIXED_NOW.getTime() - 48 * 3600 * 1000).toISOString();
    const { data } = await client
      .from('clusters')
      .insert({
        topic: '__score_test__', n_sources: 4, post_count: 1,
        first_seen: old, last_updated: old, status: 'open',
      })
      .select('id')
      .single();
    clusterId = data!.id;
    // ...nhưng có bài MỚI NHẤT chỉ 8h trước → đây mới là cái quyết định độ tươi.
    await upsertPosts(client, [{
      sourceType: 'press', sourceName: 'S-Score', externalId: 'scf1',
      title: 'tin mới', text: '', url: URL, author: null,
      publishedAt: new Date(FIXED_NOW.getTime() - 8 * 3600 * 1000).toISOString(),
      lang: null, metrics: {},
    }]);
    await client.from('posts').update({ cluster_id: clusterId }).eq('url', URL);
  });

  afterAll(async () => {
    await client.from('posts').delete().like('url', 'https://example.com/score-%');
    await client.from('clusters').delete().eq('id', clusterId);
    await client.from('sources').delete().eq('name', 'S-Score');
  });

  it('tính tuổi theo bài MỚI NHẤT (8h), không theo first_seen (48h)', async () => {
    const res = await runScoring(client, () => FIXED_NOW);
    expect(res.scored).toBeGreaterThanOrEqual(1);
    const { data } = await client
      .from('clusters').select('heat_score').eq('id', clusterId).single();
    expect(data!.heat_score).toBeCloseTo(pressHeat(4, 8), 5);
  }, 60000);
});
