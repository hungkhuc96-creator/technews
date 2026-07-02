import type { SupabaseClient } from '@supabase/supabase-js';
import { rankCandidates, type RankCandidate } from './rank';
import { engagementHeat, recencyHeat } from '../score/heat';
import type { PostMetrics } from '../types';
import { logoFor, sourceAvatar } from './sourceLogos';

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
  // Lý do hot (P2 audit): ≥3 nguồn cùng đưa tin trong 12h qua → "📈 Đang lên nhanh".
  rising: boolean;
}

// Avatar nguồn: chữ cái đầu + màu suy ra từ tên (ổn định).
export function avatarFor(name: string): { initial: string; color: string; logo: string | null } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const initial = (name.match(/[a-z0-9]/i)?.[0] ?? '•').toUpperCase();
  return { initial, color: `hsl(${h % 360} 52% 45%)`, logo: logoFor(name) };
}

export async function getFeed(
  client: SupabaseClient,
  limit = 30,
  offset = 0,
  // 'heat' = trang chủ (độ nóng, trộn X/YouTube). 'recent' = tab "Mới nhất":
  // THUẦN thời gian trên TOÀN KHO báo chí (trước đây chỉ sort lại ~40 tin đã tải
  // ở client → tin mới nhưng "nguội" không bao giờ xuất hiện).
  sort: 'heat' | 'recent' = 'heat',
): Promise<FeedItem[]> {
  // offset > 0 = "trang kế tiếp" cho cuộn vô hạn.
  const { data: clusters, error } = await client
    .from('clusters')
    .select('id, n_sources, source_types, heat_score, representative_post_id')
    .eq('status', 'open')
    .order(sort === 'recent' ? 'last_updated' : 'heat_score', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`getFeed đọc clusters lỗi: ${error.message}`);

  const repIds = (clusters ?? [])
    .map((c) => c.representative_post_id)
    .filter((id): id is string => Boolean(id));
  const clusterIds = (clusters ?? []).map((c) => c.id);

  // Bài ĐỨNG RIÊNG (X/YouTube…) chỉ trộn ở trang đầu — 7 ngày gần nhất.
  const now = Date.now();
  const since = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

  // 5 truy vấn này độc lập nhau → chạy SONG SONG (Promise.all) thay vì tuần tự,
  // cắt phần lớn thời gian chờ mạng tới Supabase (Seoul).
  const empty = { data: [] as any[] };
  const [
    { data: posts }, { data: summaries }, { data: clusterImages }, { data: clusterPosts }, { data: standalone },
  ] = await Promise.all([
    repIds.length
      ? client.from('posts').select('id, title, text, url, published_at, image_url, sources(name)').in('id', repIds)
      : Promise.resolve(empty),
    clusterIds.length
      ? client.from('cluster_summaries').select('cluster_id, title_vi, summary_vi, bullets_vi').in('cluster_id', clusterIds)
      : Promise.resolve(empty),
    clusterIds.length
      ? client.from('posts').select('cluster_id, image_url').in('cluster_id', clusterIds).not('image_url', 'is', null)
      : Promise.resolve(empty),
    clusterIds.length
      ? client.from('posts').select('cluster_id, published_at, sources(name)').in('cluster_id', clusterIds)
      : Promise.resolve(empty),
    offset === 0 && sort === 'heat'
      ? client.from('posts')
          .select('id, source_type, title, text, url, published_at, image_url, metrics, author, sources(name)')
          .neq('source_type', 'press').gte('published_at', since)
          .order('published_at', { ascending: false }).limit(200)
      : Promise.resolve(empty),
  ]);

  const postById = new Map((posts ?? []).map((p: any) => [p.id, p]));
  const sumById = new Map((summaries ?? []).map((s: any) => [s.cluster_id, s]));

  // Ảnh cụm: ưu tiên bài đại diện, nếu không có thì lấy ảnh của BẤT KỲ bài nào
  // trong cụm (tăng độ phủ thumbnail cho cụm nhiều nguồn).
  const imageByCluster = new Map<string, string>();
  for (const r of clusterImages ?? []) {
    if (!imageByCluster.has(r.cluster_id)) imageByCluster.set(r.cluster_id, r.image_url);
  }

  // Bài của mỗi cụm (đã lấy song song ở trên): dùng để (1) tìm bài MỚI NHẤT ("độ
  // tươi", giống runScoring) và (2) gom danh sách NGUỒN trong cụm → avatar xếp chồng.
  const newestByCluster = new Map<string, string>();
  const sourceNamesByCluster = new Map<string, Set<string>>();
  // Nguồn có bài trong 12h qua — ≥3 nguồn = "📈 Đang lên nhanh" (lý do hot trên thẻ).
  const recentSourcesByCluster = new Map<string, Set<string>>();
  const cutoff12h = now - 12 * 3600 * 1000;
  for (const r of clusterPosts ?? []) {
    const prev = newestByCluster.get(r.cluster_id);
    if (!prev || new Date(r.published_at) > new Date(prev)) {
      newestByCluster.set(r.cluster_id, r.published_at);
    }
    const nm = Array.isArray(r.sources) ? r.sources[0]?.name : (r.sources as any)?.name;
    if (nm) {
      if (!sourceNamesByCluster.has(r.cluster_id)) sourceNamesByCluster.set(r.cluster_id, new Set());
      sourceNamesByCluster.get(r.cluster_id)!.add(nm);
      if (new Date(r.published_at).getTime() >= cutoff12h) {
        if (!recentSourcesByCluster.has(r.cluster_id)) recentSourcesByCluster.set(r.cluster_id, new Set());
        recentSourcesByCluster.get(r.cluster_id)!.add(nm);
      }
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
        // Đưa nguồn ĐẠI DIỆN lên đầu để avatar khớp với tên báo hiển thị.
        sources: (() => {
          const names = [...(sourceNamesByCluster.get(c.id) ?? [])];
          const lead = sourceName ?? '';
          const ordered = lead ? [lead, ...names.filter((n) => n !== lead)] : names;
          return ordered.slice(0, 4).map(avatarFor);
        })(),
        authorName: null as string | null,
        metrics: {},
        text: p.text ?? null,
        sourceTypes: c.source_types ?? [],
        heat: c.heat_score,
        titleVi: sum?.title_vi ?? null,
        imageUrl: p.image_url ?? imageByCluster.get(c.id) ?? null,
        // '' là placeholder (mới dịch tiêu đề, chưa tóm tắt) → coi như chưa có.
        summary: sum?.summary_vi || null,
        bullets: Array.isArray(sum?.bullets_vi) ? sum.bullets_vi : [],
        rising: (recentSourcesByCluster.get(c.id)?.size ?? 0) >= 3,
      } satisfies FeedItem;
    })
    .filter((x): x is FeedItem => x !== null);

  // Ứng viên cụm báo chí
  const candidates: RankCandidate<FeedItem>[] = pressItems.map((it) => ({
    item: it,
    bucket: 'press',
    rawHeat: it.heat,
  }));

  // Bài ĐỨNG RIÊNG (đã lấy song song ở trên). CHỈ trộn ở TRANG ĐẦU (offset 0); các
  // trang cuộn thêm là báo chí nguội dần, tránh lặp lại X/YouTube đã hiện ở đầu feed.
  for (const p of (standalone ?? []) as any[]) {
    const ageHours = Math.max(0, (now - new Date(p.published_at).getTime()) / 3_600_000);
    const m = (p.metrics ?? {}) as { views?: number; upvotes?: number };
    const eng = Number(m.views ?? m.upvotes ?? 0);
    let rawHeat =
      p.source_type === 'x' || eng <= 0 ? recencyHeat(ageHours) : engagementHeat(eng, ageHours);
    // Tweet có ẢNH/VIDEO → ưu tiên mạnh để bài trực quan của X nổi lên trang chính.
    if (p.source_type === 'x' && p.image_url) rawHeat *= 2.5;
    const sName = Array.isArray(p.sources) ? (p.sources[0]?.name ?? null) : (p.sources?.name ?? null);
    // YouTube: nâng thumbnail lên độ phân giải cao (hqdefault 480p → maxresdefault 1280p)
    // cho bớt mờ. Thẻ có onError tự lùi về hqdefault nếu video không có bản maxres.
    let imgUrl: string | null = p.image_url ?? null;
    if (p.source_type === 'youtube' && imgUrl) {
      imgUrl = imgUrl.replace('/hqdefault.jpg', '/maxresdefault.jpg');
    }
    const item: FeedItem = {
      clusterId: p.id,
      title: p.title,
      url: p.url,
      sourceName: sName,
      publishedAt: p.published_at,
      updatedAt: null,
      nSources: 1,
      // Avatar đúng theo loại: YouTube → avatar kênh, X → logo báo/tài khoản.
      sources: sName ? [{ ...avatarFor(sName), logo: sourceAvatar(sName, p.source_type) }] : [],
      authorName: p.author ?? null,
      metrics: (p.metrics ?? {}) as PostMetrics,
      text: p.text ?? null,
      sourceTypes: [p.source_type],
      heat: rawHeat,
      titleVi: null,
      imageUrl: imgUrl,
      summary: null,
      bullets: [],
      rising: false, // bài đứng riêng (X/YouTube) 1 nguồn — không áp dụng
    };
    candidates.push({ item, bucket: p.source_type, rawHeat });
  }

  // "Mới nhất": thuần thời gian, không ranking (báo chí, bài mới nhất trước).
  if (sort === 'recent') {
    return pressItems.sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.publishedAt).getTime() -
        new Date(a.updatedAt ?? a.publishedAt).getTime(),
    );
  }

  // maxConsecutive=3: không quá 3 card cùng loại liên tiếp.
  // caps: mỗi nguồn ĐỨNG RIÊNG tối đa ~20% feed → báo chí luôn là xương sống,
  // X/YouTube... chỉ rắc thêm (X rất tươi nên nếu không chặn sẽ chiếm nửa feed).
  const standaloneCap = Math.max(3, Math.round(limit * 0.2));
  const caps = { youtube: standaloneCap, reddit: standaloneCap, x: standaloneCap, tiktok: standaloneCap };
  return rankCandidates(candidates, limit, 3, caps);
}
