import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { summarizeCluster, type ChatFn, type ArticleInput, type ClusterSummary } from './summarizeCluster';

function sourceName(p: { sources?: unknown }): string | null {
  const s = (p as { sources?: { name?: string } | { name?: string }[] }).sources;
  if (Array.isArray(s)) return s[0]?.name ?? null;
  return s?.name ?? null;
}

// Tóm tắt MỘT cụm (load post → Claude → lưu cache). Dùng cho API lazy lúc bấm.
// Trả về cache nếu đã có summary_vi khớp input_hash; null nếu cụm rỗng.
export async function summarizeClusterById(
  client: SupabaseClient,
  chat: ChatFn,
  clusterId: string,
): Promise<ClusterSummary | null> {
  const { data: posts } = await client
    .from('posts')
    .select('id, title, text, sources(name)')
    .eq('cluster_id', clusterId)
    .order('published_at', { ascending: false });
  if (!posts || posts.length === 0) return null;

  const inputHash = createHash('sha1')
    .update(posts.map((p) => p.id).sort().join(','))
    .digest('hex');

  const { data: existing } = await client
    .from('cluster_summaries')
    .select('title_vi, summary_vi, bullets_vi, input_hash')
    .eq('cluster_id', clusterId)
    .maybeSingle();
  // Đã có tóm tắt thật (summary_vi không rỗng) và đúng input_hash → trả cache.
  if (existing?.summary_vi && existing.input_hash === inputHash) {
    return {
      titleVi: existing.title_vi ?? '',
      summary: existing.summary_vi,
      bullets: Array.isArray(existing.bullets_vi) ? (existing.bullets_vi as string[]) : [],
    };
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
      title_vi: s.titleVi || existing?.title_vi || '',
      summary_vi: s.summary,
      bullets_vi: s.bullets,
      input_hash: inputHash,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'cluster_id' },
  );
  return s;
}
