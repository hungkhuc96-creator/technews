import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { runScoring } from './runScoring';
import { pressHeat } from './heat';

const client = createServiceClient();
let clusterId: string;
const FIXED_NOW = new Date('2026-06-24T10:00:00.000Z');

describe('runScoring', () => {
  beforeAll(async () => {
    // cụm test: 4 nguồn, first_seen cách "now" đúng 8 giờ
    const firstSeen = new Date(FIXED_NOW.getTime() - 8 * 3600 * 1000).toISOString();
    const { data } = await client
      .from('clusters')
      .insert({
        topic: '__score_test__', n_sources: 4, post_count: 4,
        first_seen: firstSeen, last_updated: firstSeen, status: 'open',
      })
      .select('id')
      .single();
    clusterId = data!.id;
  });

  afterAll(async () => {
    await client.from('clusters').delete().eq('id', clusterId);
  });

  it('ghi heat_score đúng công thức cho cụm đang mở', async () => {
    const res = await runScoring(client, () => FIXED_NOW);
    expect(res.scored).toBeGreaterThanOrEqual(1);

    const { data } = await client
      .from('clusters').select('heat_score').eq('id', clusterId).single();
    expect(data!.heat_score).toBeCloseTo(pressHeat(4, 8), 5);
  }, 60000); // chấm điểm mọi cụm đang mở qua mạng nên cho thời gian rộng
});
