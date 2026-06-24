import type { SupabaseClient } from '@supabase/supabase-js';

export interface FeedItem {
  clusterId: string;
  title: string;
  url: string;
  sourceName: string | null;
  publishedAt: string;
  nSources: number;
  sourceTypes: string[];
  heat: number;
}

export async function getFeed(client: SupabaseClient, limit = 30): Promise<FeedItem[]> {
  const { data: clusters, error } = await client
    .from('clusters')
    .select('id, n_sources, source_types, heat_score, representative_post_id')
    .eq('status', 'open')
    .order('heat_score', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getFeed đọc clusters lỗi: ${error.message}`);

  const repIds = (clusters ?? [])
    .map((c) => c.representative_post_id)
    .filter((id): id is string => Boolean(id));

  const { data: posts } = repIds.length
    ? await client
        .from('posts')
        .select('id, title, url, published_at, sources(name)')
        .in('id', repIds)
    : { data: [] as any[] };

  const postById = new Map((posts ?? []).map((p: any) => [p.id, p]));

  return (clusters ?? [])
    .map((c) => {
      const p = postById.get(c.representative_post_id);
      if (!p) return null;
      const sourceName = Array.isArray(p.sources)
        ? (p.sources[0]?.name ?? null)
        : (p.sources?.name ?? null);
      return {
        clusterId: c.id,
        title: p.title,
        url: p.url,
        sourceName,
        publishedAt: p.published_at,
        nSources: c.n_sources,
        sourceTypes: c.source_types ?? [],
        heat: c.heat_score,
      } satisfies FeedItem;
    })
    .filter((x): x is FeedItem => x !== null);
}
