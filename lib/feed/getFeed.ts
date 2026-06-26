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
  titleVi: string | null;
  imageUrl: string | null;
  summary: string | null;
  bullets: string[];
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
        .select('id, title, url, published_at, image_url, sources(name)')
        .in('id', repIds)
    : { data: [] as any[] };

  const postById = new Map((posts ?? []).map((p: any) => [p.id, p]));

  const clusterIds = (clusters ?? []).map((c) => c.id);
  const { data: summaries } = clusterIds.length
    ? await client
        .from('cluster_summaries')
        .select('cluster_id, title_vi, summary_vi, bullets_vi')
        .in('cluster_id', clusterIds)
    : { data: [] as any[] };
  const sumById = new Map((summaries ?? []).map((s: any) => [s.cluster_id, s]));

  // Ảnh cụm: ưu tiên bài đại diện, nếu không có thì lấy ảnh của BẤT KỲ bài nào
  // trong cụm (tăng độ phủ thumbnail cho cụm nhiều nguồn).
  const { data: clusterImages } = clusterIds.length
    ? await client
        .from('posts')
        .select('cluster_id, image_url')
        .in('cluster_id', clusterIds)
        .not('image_url', 'is', null)
    : { data: [] as any[] };
  const imageByCluster = new Map<string, string>();
  for (const r of clusterImages ?? []) {
    if (!imageByCluster.has(r.cluster_id)) imageByCluster.set(r.cluster_id, r.image_url);
  }

  return (clusters ?? [])
    .map((c) => {
      const p = postById.get(c.representative_post_id);
      if (!p) return null;
      const sourceName = Array.isArray(p.sources)
        ? (p.sources[0]?.name ?? null)
        : (p.sources?.name ?? null);
      const sum = sumById.get(c.id);
      return {
        clusterId: c.id,
        title: p.title,
        url: p.url,
        sourceName,
        publishedAt: p.published_at,
        nSources: c.n_sources,
        sourceTypes: c.source_types ?? [],
        heat: c.heat_score,
        titleVi: sum?.title_vi ?? null,
        imageUrl: p.image_url ?? imageByCluster.get(c.id) ?? null,
        summary: sum?.summary_vi ?? null,
        bullets: Array.isArray(sum?.bullets_vi) ? sum.bullets_vi : [],
      } satisfies FeedItem;
    })
    .filter((x): x is FeedItem => x !== null);
}
