import type { SupabaseClient } from '@supabase/supabase-js';
import { rankCandidates, type RankCandidate } from './rank';
import { engagementHeat, recencyHeat } from '../score/heat';
import type { PostMetrics } from '../types';
import { logoFor } from './sourceLogos';

export interface FeedItem {
  clusterId: string;
  title: string;
  url: string;
  sourceName: string | null;
  publishedAt: string;
  updatedAt: string | null;
  nSources: number;
  sources: { initial: string; color: string; logo: string | null }[];
  authorName: string | null; // tên hiển thị (vd tài khoản X)
  metrics: PostMetrics;       // like/repost/comment/views cho X, YouTube…
  text: string | null;        // nguyên văn nguồn gốc (đoạn trích RSS / nội dung post)
  sourceTypes: string[];
  heat: number;
  titleVi: string | null;
  imageUrl: string | null;
  summary: string | null;
  bullets: string[];
}

// Avatar nguồn: chữ cái đầu + màu suy ra từ tên (ổn định).
function avatarFor(name: string): { initial: string; color: string; logo: string | null } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const initial = (name.match(/[a-z0-9]/i)?.[0] ?? '•').toUpperCase();
  return { initial, color: `hsl(${h % 360} 52% 45%)`, logo: logoFor(name) };
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
        .select('id, title, text, url, published_at, image_url, sources(name)')
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

  // Bài của mỗi cụm: dùng để (1) tìm bài MỚI NHẤT ("độ tươi", giống runScoring)
  // và (2) gom danh sách NGUỒN trong cụm → avatar xếp chồng trên thẻ hero.
  const { data: clusterPosts } = clusterIds.length
    ? await client.from('posts').select('cluster_id, published_at, sources(name)').in('cluster_id', clusterIds)
    : { data: [] as any[] };
  const newestByCluster = new Map<string, string>();
  const sourceNamesByCluster = new Map<string, Set<string>>();
  for (const r of clusterPosts ?? []) {
    const prev = newestByCluster.get(r.cluster_id);
    if (!prev || new Date(r.published_at) > new Date(prev)) {
      newestByCluster.set(r.cluster_id, r.published_at);
    }
    const nm = Array.isArray(r.sources) ? r.sources[0]?.name : (r.sources as any)?.name;
    if (nm) {
      if (!sourceNamesByCluster.has(r.cluster_id)) sourceNamesByCluster.set(r.cluster_id, new Set());
      sourceNamesByCluster.get(r.cluster_id)!.add(nm);
    }
  }

  const pressItems = (clusters ?? [])
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
        updatedAt: newestByCluster.get(c.id) ?? null,
        nSources: c.n_sources,
        sources: [...(sourceNamesByCluster.get(c.id) ?? [])].slice(0, 4).map(avatarFor),
        authorName: null,
        metrics: {},
        text: p.text ?? null,
        sourceTypes: c.source_types ?? [],
        heat: c.heat_score,
        titleVi: sum?.title_vi ?? null,
        imageUrl: p.image_url ?? imageByCluster.get(c.id) ?? null,
        summary: sum?.summary_vi ?? null,
        bullets: Array.isArray(sum?.bullets_vi) ? sum.bullets_vi : [],
      } satisfies FeedItem;
    })
    .filter((x): x is FeedItem => x !== null);

  // Ứng viên cụm báo chí
  const candidates: RankCandidate<FeedItem>[] = pressItems.map((it) => ({
    item: it,
    bucket: 'press',
    rawHeat: it.heat,
  }));

  // Ứng viên bài ĐỨNG RIÊNG (YouTube/Reddit/X/TikTok) — 7 ngày gần nhất
  const now = Date.now();
  const since = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
  const { data: standalone } = await client
    .from('posts')
    .select('id, source_type, title, text, url, published_at, image_url, metrics, author, sources(name)')
    .neq('source_type', 'press')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(200);

  for (const p of (standalone ?? []) as any[]) {
    const ageHours = Math.max(0, (now - new Date(p.published_at).getTime()) / 3_600_000);
    const m = (p.metrics ?? {}) as { views?: number; upvotes?: number };
    const eng = Number(m.views ?? m.upvotes ?? 0);
    let rawHeat =
      p.source_type === 'x' || eng <= 0 ? recencyHeat(ageHours) : engagementHeat(eng, ageHours);
    // Tweet có ẢNH/VIDEO → ưu tiên mạnh để bài trực quan của X nổi lên trang chính.
    if (p.source_type === 'x' && p.image_url) rawHeat *= 2.5;
    const sName = Array.isArray(p.sources) ? (p.sources[0]?.name ?? null) : (p.sources?.name ?? null);
    const item: FeedItem = {
      clusterId: p.id,
      title: p.title,
      url: p.url,
      sourceName: sName,
      publishedAt: p.published_at,
      updatedAt: null,
      nSources: 1,
      sources: sName ? [avatarFor(sName)] : [],
      authorName: p.author ?? null,
      metrics: (p.metrics ?? {}) as PostMetrics,
      text: p.text ?? null,
      sourceTypes: [p.source_type],
      heat: rawHeat,
      titleVi: null,
      imageUrl: p.image_url ?? null,
      summary: null,
      bullets: [],
    };
    candidates.push({ item, bucket: p.source_type, rawHeat });
  }

  // maxConsecutive=3: không quá 3 card cùng loại liên tiếp.
  // caps: mỗi nguồn ĐỨNG RIÊNG tối đa ~20% feed → báo chí luôn là xương sống,
  // X/YouTube... chỉ rắc thêm (X rất tươi nên nếu không chặn sẽ chiếm nửa feed).
  const standaloneCap = Math.max(3, Math.round(limit * 0.2));
  const caps = { youtube: standaloneCap, reddit: standaloneCap, x: standaloneCap, tiktok: standaloneCap };
  return rankCandidates(candidates, limit, 3, caps);
}
