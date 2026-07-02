import type { SupabaseClient } from '@supabase/supabase-js';
import { extractEntities } from '../enrich/entities';
import { bestCluster, type ClusterCandidate } from './decide';

export interface ClusterDeps {
  embed: (text: string) => Promise<number[]>;
  now?: () => Date;
  // Chốt chặn AI: 2 tiêu đề có CÙNG sự kiện không. Nếu bỏ trống → chỉ dùng
  // embedding (như cũ). Sản xuất truyền hàm thật (Claude) để chặn "cụm hố đen".
  sameEvent?: (a: string, b: string) => Promise<boolean>;
}

const WINDOW_MS = 48 * 60 * 60 * 1000;
// Embedding chỉ LỌC ỨNG VIÊN (recall cao), AI mới là người quyết định gộp.
const JOIN_THRESHOLD = 0.82;
// Giống nhau tới mức này thì gộp thẳng, KHỎI hỏi AI (tiết kiệm ~70% lượt gọi).
// AI chỉ phân xử "vùng xám" 0.82–0.93 — nơi embedding hay nhầm khác-sự-kiện.
const AUTO_MERGE = 0.93;
// Mỗi lượt chạy xử lý tối đa ngần này bài (tránh dính trần 1000 dòng của Supabase
// một cách IM LẶNG; bài dư tự xử lý ở lượt cron sau).
const BATCH_LIMIT = 500;

// Cụm giữ trong bộ nhớ suốt 1 lượt chạy — tránh fetch lại toàn bộ cụm (kèm vector
// centroid rất nặng) cho TỪNG bài như trước.
interface MemCluster {
  id: string;
  centroid: number[];
  entities: string[];
  postCount: number;
  repId: string | null;
  lastUpdated: number;
}

export async function runClustering(
  client: SupabaseClient,
  deps: ClusterDeps,
  opts: { urlPrefix?: string } = {},
): Promise<{ processed: number; created: number; updated: number }> {
  const now = deps.now ? deps.now() : new Date();
  let processed = 0;
  let created = 0;
  let updated = 0;

  // Bài báo chưa gán cụm, cũ trước (cụm hình thành theo thời gian).
  let query = client
    .from('posts')
    .select('id, source_id, source_type, title, text, published_at, embedding, entities')
    .eq('source_type', 'press')
    .is('cluster_id', null)
    .order('published_at', { ascending: true })
    .limit(BATCH_LIMIT);
  if (opts.urlPrefix) query = query.like('url', `${opts.urlPrefix}%`);
  const { data: posts, error } = await query;
  if (error) throw new Error(`runClustering đọc posts lỗi: ${error.message}`);

  // Nạp cụm mở (cập nhật trong 48h) MỘT LẦN — phân trang vì centroid nặng và
  // Supabase trả tối đa 1000 dòng/truy vấn.
  const since = now.getTime() - WINDOW_MS;
  const mem: MemCluster[] = [];
  for (let from = 0; ; from += 500) {
    const { data: batch } = await client
      .from('clusters')
      .select('id, centroid, entities, post_count, representative_post_id, last_updated')
      .eq('status', 'open')
      .gte('last_updated', new Date(since).toISOString())
      .range(from, from + 499);
    for (const c of batch ?? []) {
      if (!Array.isArray(c.centroid)) continue;
      mem.push({
        id: c.id,
        centroid: c.centroid as number[],
        entities: c.entities ?? [],
        postCount: c.post_count as number,
        repId: (c.representative_post_id as string | null) ?? null,
        lastUpdated: new Date(c.last_updated).getTime(),
      });
    }
    if (!batch || batch.length < 500) break;
  }

  // Tiêu đề bài đại diện (cho câu hỏi AI) — nhớ lại để khỏi hỏi DB lặp.
  const repTitleCache = new Map<string, string>();
  const repTitle = async (c: MemCluster): Promise<string> => {
    if (!c.repId) return '';
    const hit = repTitleCache.get(c.id);
    if (hit !== undefined) return hit;
    const { data } = await client.from('posts').select('title').eq('id', c.repId).maybeSingle();
    const t = (data?.title as string | undefined) ?? '';
    repTitleCache.set(c.id, t);
    return t;
  };

  for (const p of posts ?? []) {
    processed++;

    // 1) Embedding + thực thể (tính nếu chưa có, rồi lưu lại vào post)
    const embedding: number[] =
      Array.isArray(p.embedding) && p.embedding.length > 0
        ? (p.embedding as number[])
        : await deps.embed(`${p.title}. ${p.text ?? ''}`);
    const entities: string[] =
      Array.isArray(p.entities) && p.entities.length > 0
        ? (p.entities as string[])
        : extractEntities(p.title);
    await client.from('posts').update({ embedding, entities }).eq('id', p.id);

    // 2) Ứng viên từ cache (cụm còn trong cửa sổ 48h)
    const candidates: ClusterCandidate[] = mem
      .filter((c) => c.lastUpdated >= since)
      .map((c) => ({ id: c.id, centroid: c.centroid, entities: c.entities }));

    let match = bestCluster(embedding, entities, candidates, JOIN_THRESHOLD);

    // 3) CHỐT CHẶN AI — chỉ hỏi ở "vùng xám": đủ giống để nghi, chưa đủ để chắc.
    if (match && match.score < AUTO_MERGE && deps.sameEvent) {
      const cand = mem.find((c) => c.id === match!.clusterId)!;
      const t = await repTitle(cand);
      if (t && !(await deps.sameEvent(p.title, t))) match = null;
    }

    if (match) {
      // 4a) Nhập cụm: centroid + entities ĐÔNG CỨNG theo bài đầu (không trôi).
      const cluster = mem.find((c) => c.id === match!.clusterId)!;
      await client.from('posts').update({ cluster_id: cluster.id }).eq('id', p.id);

      const { sources, sourceTypes } = await sourceStats(client, cluster.id);
      cluster.postCount += 1;
      cluster.lastUpdated = now.getTime();
      await client
        .from('clusters')
        .update({
          post_count: cluster.postCount,
          n_sources: sources,
          source_types: sourceTypes,
          last_updated: now.toISOString(),
        })
        .eq('id', cluster.id);
      updated++;
    } else {
      // 4b) Tạo cụm mới + đưa ngay vào cache để các bài sau trong lượt này gộp được
      const { data: newCluster, error: insErr } = await client
        .from('clusters')
        .insert({
          representative_post_id: p.id,
          centroid: embedding,
          entities,
          post_count: 1,
          n_sources: 1,
          source_types: [p.source_type],
          first_seen: p.published_at,
          last_updated: now.toISOString(),
          status: 'open',
        })
        .select('id')
        .single();
      if (insErr) throw new Error(`runClustering tạo cụm lỗi: ${insErr.message}`);
      await client.from('posts').update({ cluster_id: newCluster.id }).eq('id', p.id);
      mem.push({
        id: newCluster.id,
        centroid: embedding,
        entities,
        postCount: 1,
        repId: p.id,
        lastUpdated: now.getTime(),
      });
      repTitleCache.set(newCluster.id, p.title);
      created++;
    }
  }

  return { processed, created, updated };
}

// Đếm số nguồn phân biệt + danh sách loại nguồn của một cụm.
async function sourceStats(
  client: SupabaseClient,
  clusterId: string,
): Promise<{ sources: number; sourceTypes: string[] }> {
  const { data } = await client
    .from('posts')
    .select('source_id, source_type')
    .eq('cluster_id', clusterId);
  const sources = new Set((data ?? []).map((r) => r.source_id)).size;
  const sourceTypes = [...new Set((data ?? []).map((r) => r.source_type))];
  return { sources, sourceTypes };
}
