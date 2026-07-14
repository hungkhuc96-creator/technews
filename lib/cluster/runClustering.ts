import type { SupabaseClient } from '@supabase/supabase-js';
import { extractEntities } from '../enrich/entities';
import { versionConflict } from './versionConflict';

export interface ClusterDeps {
  embed: (text: string) => Promise<number[]>;
  now?: () => Date;
  // Chốt chặn AI: 2 tiêu đề có CÙNG sự kiện không. Nếu bỏ trống → chỉ dùng
  // embedding (như cũ). Sản xuất truyền hàm thật (Claude) để chặn "cụm hố đen".
  sameEvent?: (a: string, b: string) => Promise<boolean>;
}

const WINDOW_MS = 72 * 60 * 60 * 1000;
// Embedding chỉ LỌC ỨNG VIÊN (recall cao), AI mới là người quyết định gộp.
const JOIN_THRESHOLD = 0.82;
// Giống nhau tới mức này thì gộp thẳng, KHỎI hỏi AI (tiết kiệm ~70% lượt gọi).
// AI chỉ phân xử "vùng xám" 0.82–0.93 — nơi embedding hay nhầm khác-sự-kiện.
const AUTO_MERGE = 0.93;
// Mỗi lượt chạy xử lý tối đa ngần này bài (tránh dính trần 1000 dòng của Supabase
// một cách IM LẶNG; bài dư tự xử lý ở lượt cron sau).
const BATCH_LIMIT = 500;
// Model embedding trả 384 chiều; chỉ khớp bằng pgvector khi đúng chiều (bài rác cũ
// 3 chiều thì bỏ qua khâu khớp → tự tạo cụm riêng).
const EMBED_DIM = 384;

// Kết quả match_cluster (RPC) — payload nhẹ, KHÔNG kèm vector centroid.
interface MatchRow {
  id: string;
  score: number;
  entities: string[] | null;
  post_count: number;
  rep_title: string | null;
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

  // TÌM CỤM bằng pgvector NGAY TRONG DB (RPC match_cluster) thay vì tải toàn bộ
  // centroid (8,3 KB/cụm) ra đây mỗi lượt — trước đây là thủ phạm ~12 GB egress/tháng.
  // RPC chỉ trả về id + điểm + entities + tiêu đề đại diện (payload tí xíu). Cụm mới
  // tạo/ cập nhật trong lượt này được ghi ngay vào DB nên bài sau vẫn khớp được.
  const since = now.getTime() - WINDOW_MS;
  const sinceIso = new Date(since).toISOString();

  // AI (sameEvent) có thể chết giữa chừng (hết credit Anthropic...). Khi đó KHÔNG
  // được làm sập gom cụm — tắt AI cho cả lượt, rơi về chế độ thận trọng (chỉ gộp
  // khi trùng thực thể) để feed vẫn có cụm mới (tiêu đề tạm tiếng Anh).
  let aiDown = false;

  for (const p of posts ?? []) {
    processed++;

    // 1) Embedding + thực thể (tính nếu chưa có, rồi lưu lại vào post). Trigger DB tự
    //    đồng bộ cột embedding_vec từ jsonb này.
    const embedding: number[] =
      Array.isArray(p.embedding) && p.embedding.length > 0
        ? (p.embedding as number[])
        : await deps.embed(`${p.title}. ${p.text ?? ''}`);
    const entities: string[] =
      Array.isArray(p.entities) && p.entities.length > 0
        ? (p.entities as string[])
        : extractEntities(p.title);
    await client.from('posts').update({ embedding, entities }).eq('id', p.id);

    // 2) Ứng viên gần nhất trong cửa sổ 72h (cosine tính trong DB qua pgvector).
    let match: {
      clusterId: string;
      score: number;
      overlap: boolean;
      repTitle: string;
      entities: string[];
      postCount: number;
    } | null = null;
    if (embedding.length === EMBED_DIM) {
      const { data: rows, error: mErr } = await client.rpc('match_cluster', {
        query_vec: embedding,
        since_ts: sinceIso,
        min_score: JOIN_THRESHOLD,
      });
      if (mErr) throw new Error(`runClustering match_cluster lỗi: ${mErr.message}`);
      const r = (Array.isArray(rows) ? rows[0] : null) as MatchRow | null;
      if (r) {
        const entSet = new Set(entities);
        const candEnts = r.entities ?? [];
        match = {
          clusterId: r.id,
          score: r.score,
          overlap: candEnts.some((e) => entSet.has(e)),
          repTitle: r.rep_title ?? '',
          entities: candEnts,
          postCount: r.post_count,
        };
      }
    }

    // 2b) CHỐT PHIÊN BẢN (luật cứng, trước cả sure-path lẫn AI): bài mới và cụm ứng
    //     viên nói về OS CÙNG sản phẩm nhưng KHÁC số hiệu (macOS 26.6 vs macOS 27) →
    //     khác sự kiện, cấm gộp. Embedding 2 bản beta OS giống nhau ~0.90 và AI hay
    //     nhầm "cùng sự kiện" (case thật 14/7: Tahoe 26.6 gộp nhầm Golden Gate 27).
    if (match && match.repTitle && versionConflict(p.title, match.repTitle)) match = null;

    // 3) QUYẾT ĐỊNH GỘP:
    //  - Rất giống (≥0.93) VÀ trùng thực thể → chắc chắn, gộp thẳng (khỏi hỏi AI).
    //  - Còn lại (vùng xám, hoặc rất giống nhưng khác thực thể) → để AI phân xử.
    //  - AI CHẾT GIỮA LƯỢT (hết credit/mạng) → vùng xám KHÔNG gộp. Trùng thực
    //    thể không đủ tin: "chôn iPhone vào viên nang thời gian" từng bị gộp
    //    vào cụm chip A20 chỉ vì cùng dính Apple/iPhone (case thật 5/7). Gộp
    //    nhầm (tin sai) tệ hơn nhiều so với tách nhầm (trùng tin).
    //  - Không cấu hình AI từ đầu → thận trọng: chỉ gộp khi trùng thực thể (như cũ).
    if (match) {
      const sure = match.score >= AUTO_MERGE && match.overlap;
      if (!sure) {
        if (aiDown) {
          match = null;
        } else if (deps.sameEvent) {
          try {
            if (!match.repTitle || !(await deps.sameEvent(p.title, match.repTitle))) match = null;
          } catch (e) {
            // Tắt AI cả lượt ngay lần lỗi đầu. Không ném lỗi → gom cụm không sập.
            aiDown = true;
            console.warn(
              `[cluster] sameEvent lỗi → vùng xám ngừng gộp cho tới hết lượt: ${(e as Error).message?.slice(0, 120)}`,
            );
            match = null;
          }
        } else if (!match.overlap) {
          match = null;
        }
      }
    }

    if (match) {
      // 4a) Nhập cụm: gán bài, tính lại centroid = TRUNG BÌNH embedding NGAY TRONG DB
      //     (RPC recompute_centroid), thực thể GỘP thêm. Không kéo vector nào ra ngoài.
      await client.from('posts').update({ cluster_id: match.clusterId }).eq('id', p.id);
      const { error: rcErr } = await client.rpc('recompute_centroid', { cid: match.clusterId });
      if (rcErr) throw new Error(`runClustering recompute_centroid lỗi: ${rcErr.message}`);

      const newEntities = [...new Set([...match.entities, ...entities])].slice(0, 40);
      const { sources, sourceTypes } = await sourceStats(client, match.clusterId);
      await client
        .from('clusters')
        .update({
          post_count: match.postCount + 1,
          entities: newEntities,
          n_sources: sources,
          source_types: sourceTypes,
          last_updated: now.toISOString(),
        })
        .eq('id', match.clusterId);
      updated++;
    } else {
      // 4b) Tạo cụm mới (centroid jsonb = embedding bài này → trigger tự set centroid_vec).
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
