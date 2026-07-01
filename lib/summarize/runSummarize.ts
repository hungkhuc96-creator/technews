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
  opts: { limit?: number; concurrency?: number } = {},
): Promise<{ summarized: number; skipped: number }> {
  const limit = opts.limit ?? 40;
  const concurrency = opts.concurrency ?? 6;
  const { data: clusters, error } = await client
    .from('clusters')
    .select('id')
    .eq('status', 'open')
    .order('heat_score', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`runSummarize đọc clusters lỗi: ${error.message}`);

  // Đọc hash các cụm đã tóm tắt trong 1 truy vấn (thay vì hỏi từng cụm) → chạy lại nhanh.
  const ids = (clusters ?? []).map((c) => c.id);
  const { data: existing } = ids.length
    ? await client.from('cluster_summaries').select('cluster_id, input_hash').in('cluster_id', ids)
    : { data: [] as any[] };
  const hashByCluster = new Map((existing ?? []).map((e: any) => [e.cluster_id, e.input_hash]));

  let summarized = 0;
  let skipped = 0;

  // Tóm tắt 1 cụm (nếu nội dung đổi so với hash đã lưu). Gọi AI nên chạy SONG SONG
  // theo lô để top-N kịp trong thời gian cron.
  const one = async (clusterId: string) => {
    const { data: posts } = await client
      .from('posts')
      .select('id, title, text, sources(name)')
      .eq('cluster_id', clusterId)
      .order('published_at', { ascending: false });
    if (!posts || posts.length === 0) return;

    const inputHash = createHash('sha1')
      .update(posts.map((p) => p.id).sort().join(','))
      .digest('hex');
    if (hashByCluster.get(clusterId) === inputHash) {
      skipped++;
      return;
    }

    const articles: ArticleInput[] = posts.slice(0, 8).map((p) => ({
      title: p.title,
      text: (p.text ?? '').slice(0, 500),
      sourceName: sourceName(p),
    }));
    const s = await summarizeCluster(articles, chat);

    await client.from('cluster_summaries').upsert(
      {
        cluster_id: clusterId,
        title_vi: s.titleVi,
        summary_vi: s.summary,
        bullets_vi: s.bullets,
        input_hash: inputHash,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'cluster_id' },
    );
    summarized++;
  };

  for (let i = 0; i < ids.length; i += concurrency) {
    await Promise.all(ids.slice(i, i + concurrency).map(one));
  }

  return { summarized, skipped };
}
