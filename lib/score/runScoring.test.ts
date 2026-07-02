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
    // topic filter: CHỈ chấm cụm test — không đầu độc điểm của cụm thật bằng FIXED_NOW quá khứ.
    const res = await runScoring(client, () => FIXED_NOW, { topic: '__score_test__' });
    expect(res.scored).toBe(1);
    const { data } = await client
      .from('clusters').select('heat_score').eq('id', clusterId).single();
    // Tín hiệu thật của cụm test: 1 nguồn có bài trong 12h (bài 8h tuổi), cụm sống 48h.
    expect(data!.heat_score).toBeCloseTo(
      pressHeat(4, 8, { newSources12h: 1, firstSeenAgeHours: 48 }),
      5,
    );
  }, 60000);
});

describe('runScoring — đóng cụm cũ', () => {
  let staleId: string;
  const NOW = new Date('2026-06-24T10:00:00.000Z');
  const STALE_URL = 'https://example.com/score-stale1';

  beforeAll(async () => {
    await client.from('posts').delete().like('url', 'https://example.com/score-stale%');
    await client.from('sources').delete().eq('name', 'S-Stale');
    const t = new Date(NOW.getTime() - 10 * 24 * 3600 * 1000).toISOString(); // 10 ngày trước
    const { data } = await client
      .from('clusters')
      .insert({ topic: '__stale_test__', n_sources: 2, post_count: 1,
        first_seen: t, last_updated: t, status: 'open' })
      .select('id').single();
    staleId = data!.id;
    await upsertPosts(client, [{
      sourceType: 'press', sourceName: 'S-Stale', externalId: 'stale1',
      title: 'tin cũ', text: '', url: STALE_URL, author: null,
      publishedAt: t, lang: null, metrics: {},
    }]);
    await client.from('posts').update({ cluster_id: staleId }).eq('url', STALE_URL);
  });

  afterAll(async () => {
    await client.from('posts').delete().like('url', 'https://example.com/score-stale%');
    await client.from('clusters').delete().eq('id', staleId);
    await client.from('sources').delete().eq('name', 'S-Stale');
  });

  it('cụm có bài mới nhất > 7 ngày → bị ĐÓNG (archived), không chấm điểm', async () => {
    const res = await runScoring(client, () => NOW, { topic: '__stale_test__' });
    expect(res.closed).toBeGreaterThanOrEqual(1);
    const { data } = await client
      .from('clusters').select('status').eq('id', staleId).single();
    expect(data!.status).toBe('archived');
  }, 60000);
});
