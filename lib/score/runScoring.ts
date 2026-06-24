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

  let scored = 0;
  for (const c of clusters ?? []) {
    const ageHours = (current.getTime() - new Date(c.first_seen).getTime()) / 3_600_000;
    const heat = pressHeat(c.n_sources, Math.max(0, ageHours));
    await client.from('clusters').update({ heat_score: heat }).eq('id', c.id);
    scored++;
  }
  return { scored };
}
