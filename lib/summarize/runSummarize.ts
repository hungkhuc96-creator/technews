import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { summarizeCluster, type ChatFn, type ArticleInput } from './summarizeCluster';

function sourceName(p: { sources?: unknown }): string | null {
  const s = (p as { sources?: { name?: string } | { name?: string }[] }).sources;
  if (Array.isArray(s)) return s[0]?.name ?? null;
  return s?.name ?? null;
}

export async function runSummarize(
  client: SupabaseClient,
  chat: ChatFn,
  opts: { limit?: number } = {},
): Promise<{ summarized: number; skipped: number }> {
  const limit = opts.limit ?? 40;
  const { data: clusters, error } = await client
    .from('clusters')
    .select('id')
    .eq('status', 'open')
    .order('heat_score', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`runSummarize đọc clusters lỗi: ${error.message}`);

  let summarized = 0;
  let skipped = 0;

  for (const cl of clusters ?? []) {
    const { data: posts } = await client
      .from('posts')
      .select('id, title, text, sources(name)')
      .eq('cluster_id', cl.id)
      .order('published_at', { ascending: false });
    if (!posts || posts.length === 0) continue;

    const inputHash = createHash('sha1')
      .update(posts.map((p) => p.id).sort().join(','))
      .digest('hex');

    const { data: existing } = await client
      .from('cluster_summaries').select('input_hash').eq('cluster_id', cl.id).maybeSingle();
    if (existing?.input_hash === inputHash) {
      skipped++;
      continue;
    }

    const articles: ArticleInput[] = posts.slice(0, 8).map((p) => ({
      title: p.title,
      text: (p.text ?? '').slice(0, 500),
      sourceName: sourceName(p),
    }));
    const s = await summarizeCluster(articles, chat);

    await client.from('cluster_summaries').upsert(
      {
        cluster_id: cl.id,
        title_vi: s.titleVi,
        summary_vi: s.summary,
        bullets_vi: s.bullets,
        input_hash: inputHash,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'cluster_id' },
    );
    summarized++;
  }

  return { summarized, skipped };
}
