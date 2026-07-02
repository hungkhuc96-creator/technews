import type { SupabaseClient } from '@supabase/supabase-js';
import { avatarFor, type FeedItem } from './getFeed';
import { sourceAvatar } from './sourceLogos';
import type { PostMetrics } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nameOf(p: { sources?: unknown }): string | null {
  const s = (p as { sources?: { name?: string } | { name?: string }[] }).sources;
  if (Array.isArray(s)) return s[0]?.name ?? null;
  return s?.name ?? null;
}

// Tải MỘT tin cho trang chi tiết /tin/[id]. id là cluster (báo chí) hoặc post
// đứng riêng (YouTube/X...). Không có → null (trang trả 404).
export async function getFeedItem(client: SupabaseClient, id: string): Promise<FeedItem | null> {
  if (!UUID_RE.test(id)) return null;

  // 1) Thử cụm báo chí
  const { data: cluster } = await client
    .from('clusters')
    .select('id, n_sources, source_types, heat_score, representative_post_id')
    .eq('id', id)
    .maybeSingle();

  if (cluster?.representative_post_id) {
    const [{ data: post }, { data: sum }, { data: clusterPosts }] = await Promise.all([
      client
        .from('posts')
        .select('id, title, text, url, published_at, image_url, sources(name)')
        .eq('id', cluster.representative_post_id)
        .maybeSingle(),
      client
        .from('cluster_summaries')
        .select('title_vi, summary_vi, bullets_vi')
        .eq('cluster_id', cluster.id)
        .maybeSingle(),
      client
        .from('posts')
        .select('published_at, image_url, sources(name)')
        .eq('cluster_id', cluster.id),
    ]);
    if (!post) return null;

    const sourceName = nameOf(post);
    const names = [...new Set((clusterPosts ?? []).map(nameOf).filter((n): n is string => !!n))];
    const ordered = sourceName ? [sourceName, ...names.filter((n) => n !== sourceName)] : names;
    const newest = (clusterPosts ?? [])
      .map((p) => p.published_at as string)
      .sort()
      .at(-1);
    const fallbackImage = (clusterPosts ?? []).find((p) => p.image_url)?.image_url ?? null;

    return {
      clusterId: cluster.id,
      title: post.title,
      url: post.url,
      sourceName,
      publishedAt: post.published_at,
      updatedAt: newest ?? null,
      nSources: cluster.n_sources,
      sources: ordered.slice(0, 4).map(avatarFor),
      authorName: null,
      metrics: {},
      text: post.text ?? null,
      sourceTypes: cluster.source_types ?? ['press'],
      heat: cluster.heat_score,
      titleVi: sum?.title_vi ?? null,
      imageUrl: post.image_url ?? fallbackImage,
      summary: sum?.summary_vi || null, // '' placeholder → coi như chưa có
      bullets: Array.isArray(sum?.bullets_vi) ? sum.bullets_vi : [],
      rising: false, // trang chi tiết không cần badge feed
    };
  }

  // 2) Thử bài đứng riêng (YouTube/X/Reddit…)
  const { data: p } = await client
    .from('posts')
    .select('id, source_type, title, text, url, published_at, image_url, metrics, author, sources(name)')
    .eq('id', id)
    .maybeSingle();
  if (!p) return null;

  const sName = nameOf(p);
  let imgUrl: string | null = p.image_url ?? null;
  if (p.source_type === 'youtube' && imgUrl) {
    imgUrl = imgUrl.replace('/hqdefault.jpg', '/maxresdefault.jpg');
  }
  return {
    clusterId: p.id,
    title: p.title,
    url: p.url,
    sourceName: sName,
    publishedAt: p.published_at,
    updatedAt: null,
    nSources: 1,
    sources: sName ? [{ ...avatarFor(sName), logo: sourceAvatar(sName, p.source_type) }] : [],
    authorName: p.author ?? null,
    metrics: (p.metrics ?? {}) as PostMetrics,
    text: p.text ?? null,
    sourceTypes: [p.source_type],
    heat: 0,
    titleVi: null,
    imageUrl: imgUrl,
    summary: null,
    bullets: [],
    rising: false,
  };
}
