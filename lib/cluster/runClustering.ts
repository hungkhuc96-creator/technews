import type { SupabaseClient } from '@supabase/supabase-js';
import { extractEntities } from '../enrich/entities';
import { bestCluster, type ClusterCandidate } from './decide';

export interface ClusterDeps {
  embed: (text: string) => Promise<number[]>;
  now?: () => Date;
}

const WINDOW_MS = 48 * 60 * 60 * 1000;

export async function runClustering(
  client: SupabaseClient,
  deps: ClusterDeps,
  opts: { urlPrefix?: string } = {},
): Promise<{ processed: number; created: number; updated: number }> {
  const now = deps.now ? deps.now() : new Date();
  let processed = 0;
  let created = 0;
  let updated = 0;

  // Lấy các post báo chí chưa gán cụm, cũ trước (để cụm hình thành theo thời gian).
  // opts.urlPrefix dùng để giới hạn phạm vi (vd test chỉ chạy trên tin của nó).
  let query = client
    .from('posts')
    .select('id, source_id, source_type, title, text, published_at, embedding, entities')
    .eq('source_type', 'press')
    .is('cluster_id', null)
    .order('published_at', { ascending: true });
  if (opts.urlPrefix) query = query.like('url', `${opts.urlPrefix}%`);
  const { data: posts, error } = await query;
  if (error) throw new Error(`runClustering đọc posts lỗi: ${error.message}`);

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

    // 2) Ứng viên: cụm đang mở, cập nhật trong 48h
    const since = new Date(now.getTime() - WINDOW_MS).toISOString();
    const { data: openClusters } = await client
      .from('clusters')
      .select('id, centroid, entities, post_count')
      .eq('status', 'open')
      .gte('last_updated', since);

    const candidates: ClusterCandidate[] = (openClusters ?? [])
      .filter((c) => Array.isArray(c.centroid))
      .map((c) => ({ id: c.id, centroid: c.centroid as number[], entities: c.entities ?? [] }));

    const match = bestCluster(embedding, entities, candidates);

    if (match) {
      // 3a) Nhập cụm: cập nhật centroid (trung bình động), post_count, thực thể, nguồn
      const cluster = (openClusters ?? []).find((c) => c.id === match.clusterId)!;
      const oldCentroid = cluster.centroid as number[];
      const oldCount = cluster.post_count as number;
      const newCentroid = oldCentroid.map(
        (x, i) => (x * oldCount + embedding[i]) / (oldCount + 1),
      );
      const mergedEntities = [...new Set([...(cluster.entities ?? []), ...entities])];

      await client.from('posts').update({ cluster_id: match.clusterId }).eq('id', p.id);

      const { sources, sourceTypes } = await sourceStats(client, match.clusterId);
      await client
        .from('clusters')
        .update({
          centroid: newCentroid,
          post_count: oldCount + 1,
          entities: mergedEntities,
          n_sources: sources,
          source_types: sourceTypes,
          last_updated: now.toISOString(),
        })
        .eq('id', match.clusterId);
      updated++;
    } else {
      // 3b) Tạo cụm mới
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
