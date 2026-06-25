import type { SupabaseClient } from '@supabase/supabase-js';
import { pressHeat } from './heat';

export async function runScoring(
  client: SupabaseClient,
  now: () => Date = () => new Date(),
): Promise<{ scored: number }> {
  const current = now();
  const { data: clusters, error } = await client
    .from('clusters')
    .select('id, n_sources, first_seen')
    .eq('status', 'open');
  if (error) throw new Error(`runScoring đọc clusters lỗi: ${error.message}`);

  // Thời điểm bài MỚI NHẤT của mỗi cụm — quyết định "độ tươi".
  // (Dùng cái này thay first_seen để chủ đề vẫn đang được cập nhật không bị coi là cũ.)
  const { data: posts } = await client
    .from('posts')
    .select('cluster_id, published_at')
    .not('cluster_id', 'is', null);
  const newest = new Map<string, number>();
  for (const p of posts ?? []) {
    const t = new Date(p.published_at).getTime();
    const prev = newest.get(p.cluster_id);
    if (prev === undefined || t > prev) newest.set(p.cluster_id, t);
  }

  let scored = 0;
  for (const c of clusters ?? []) {
    const freshMs = newest.get(c.id) ?? new Date(c.first_seen).getTime();
    const ageHours = Math.max(0, (current.getTime() - freshMs) / 3_600_000);
    await client
      .from('clusters')
      .update({ heat_score: pressHeat(c.n_sources, ageHours) })
      .eq('id', c.id);
    scored++;
  }
  return { scored };
}
