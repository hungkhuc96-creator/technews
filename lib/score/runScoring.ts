import type { SupabaseClient } from '@supabase/supabase-js';
import { pressHeat } from './heat';

// Cụm mà bài mới nhất đã quá ngần này → ĐÓNG lại (status='archived'): ngừng chấm
// điểm cho cụm nguội, để runScoring không phải xử lý cụm cũ tích tụ vô hạn.
// ('archived' là giá trị schema cho phép; getFeed & gom cụm chỉ xét status='open'.)
const STALE_DAYS = 7;

export async function runScoring(
  client: SupabaseClient,
  now: () => Date = () => new Date(),
): Promise<{ scored: number; closed: number }> {
  const current = now();
  // PHÂN TRANG: Supabase cắt ở 1000 dòng MỘT CÁCH IM LẶNG. Khi cụm mở vượt 1000,
  // đọc 1 lần sẽ bỏ sót — cụm sót không bao giờ được chấm lại/đóng, điểm cũ (có thể
  // sai) đóng băng vĩnh viễn trên feed. (Bug thật đã gặp: 1309 cụm mở, 309 cụm kẹt
  // điểm "tuổi 0" chiếm top nhiều ngày.)
  const clusters: { id: string; n_sources: number; first_seen: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: batch, error } = await client
      .from('clusters')
      .select('id, n_sources, first_seen')
      .eq('status', 'open')
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(`runScoring đọc clusters lỗi: ${error.message}`);
    clusters.push(...(batch ?? []));
    if (!batch || batch.length < 1000) break;
  }

  // Thời điểm bài MỚI NHẤT của mỗi cụm — quyết định "độ tươi".
  // (Dùng cái này thay first_seen để chủ đề vẫn đang được cập nhật không bị coi là cũ.)
  // PHÂN TRANG: Supabase trả tối đa 1000 dòng/truy vấn; đọc theo lô để không sót
  // bài (sót sẽ khiến cụm bị tính nhầm là cũ → đóng oan).
  const newest = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    // .order('id') để trang ổn định — phân trang KHÔNG order có thể trả trùng/sót dòng.
    const { data: posts } = await client
      .from('posts')
      .select('cluster_id, published_at')
      .not('cluster_id', 'is', null)
      .order('id')
      .range(from, from + 999);
    for (const p of posts ?? []) {
      const t = new Date(p.published_at).getTime();
      const prev = newest.get(p.cluster_id);
      if (prev === undefined || t > prev) newest.set(p.cluster_id, t);
    }
    if (!posts || posts.length < 1000) break;
  }

  // Tách cụm "đã nguội" (đóng) khỏi cụm "còn sống" (chấm điểm).
  const staleMs = STALE_DAYS * 24 * 3_600_000;
  const staleIds: string[] = [];
  const active: { id: string; n_sources: number; ageHours: number }[] = [];
  for (const c of clusters ?? []) {
    const freshMs = newest.get(c.id) ?? new Date(c.first_seen).getTime();
    const ageMs = Math.max(0, current.getTime() - freshMs);
    if (ageMs > staleMs) staleIds.push(c.id);
    else active.push({ id: c.id, n_sources: c.n_sources, ageHours: ageMs / 3_600_000 });
  }

  // Đóng cụm cũ theo lô. Lô NHỎ (50) vì .in() nhồi nhiều UUID vào URL dễ "fetch
  // failed" (URL quá dài). Chỉ đếm khi update thật sự thành công.
  let closed = 0;
  for (let i = 0; i < staleIds.length; i += 50) {
    const chunk = staleIds.slice(i, i + 50);
    const { error: closeErr } = await client
      .from('clusters').update({ status: 'archived' }).in('id', chunk);
    if (closeErr) throw new Error(`runScoring đóng cụm lỗi: ${closeErr.message}`);
    closed += chunk.length;
  }

  // Chấm điểm SONG SONG theo lô (mỗi cụm 1 heat_score riêng nên không gộp 1 query
  // được; chạy ~25 update đồng thời để không tuần tự ì ạch ~900 lượt).
  let scored = 0;
  for (let i = 0; i < active.length; i += 25) {
    const chunk = active.slice(i, i + 25);
    const results = await Promise.all(
      chunk.map((c) =>
        client
          .from('clusters')
          .update({ heat_score: pressHeat(c.n_sources, c.ageHours) })
          .eq('id', c.id),
      ),
    );
    // Không nuốt lỗi im lặng: 1 update hỏng = điểm cũ sai nằm lại trên feed.
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(`runScoring ghi điểm lỗi: ${failed.error.message}`);
    scored += chunk.length;
  }
  return { scored, closed };
}
