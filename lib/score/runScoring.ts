import type { SupabaseClient } from '@supabase/supabase-js';
import { pressHeat, type PressHeatOpts } from './heat';
import { isTier1, isUsOnly } from './signals';

// Cụm mà bài mới nhất đã quá ngần này → ĐÓNG lại (status='archived'): ngừng chấm
// điểm cho cụm nguội, để runScoring không phải xử lý cụm cũ tích tụ vô hạn.
// ('archived' là giá trị schema cho phép; getFeed & gom cụm chỉ xét status='open'.)
const STALE_DAYS = 7;

export async function runScoring(
  client: SupabaseClient,
  now: () => Date = () => new Date(),
  // topic: CHỈ chấm cụm có topic này — dành cho TEST. Test từng chạy trên toàn DB
  // thật với đồng hồ giả (quá khứ) → mọi cụm thật thành "tuổi 0", điểm rác nằm lại
  // trên feed tới lượt cron sau. Lọc theo topic để test không đụng dữ liệu thật.
  opts: { topic?: string } = {},
): Promise<{ scored: number; closed: number }> {
  const current = now();
  // PHÂN TRANG: Supabase cắt ở 1000 dòng MỘT CÁCH IM LẶNG. Khi cụm mở vượt 1000,
  // đọc 1 lần sẽ bỏ sót — cụm sót không bao giờ được chấm lại/đóng, điểm cũ (có thể
  // sai) đóng băng vĩnh viễn trên feed. (Bug thật đã gặp: 1309 cụm mở, 309 cụm kẹt
  // điểm "tuổi 0" chiếm top nhiều ngày.)
  const clusters: { id: string; n_sources: number; first_seen: string }[] = [];
  for (let from = 0; ; from += 1000) {
    let q = client
      .from('clusters')
      .select('id, n_sources, first_seen')
      .eq('status', 'open')
      .order('id')
      .range(from, from + 999);
    if (opts.topic) q = q.eq('topic', opts.topic);
    const { data: batch, error } = await q;
    if (error) throw new Error(`runScoring đọc clusters lỗi: ${error.message}`);
    clusters.push(...(batch ?? []));
    if (!batch || batch.length < 1000) break;
  }

  // Tên nguồn (id → tên) để nhận diện nguồn tier-1 — bảng sources nhỏ, đọc 1 lần.
  const { data: srcRows } = await client.from('sources').select('id, name');
  const srcName = new Map((srcRows ?? []).map((s) => [s.id as string, s.name as string]));

  // Quét bài của mọi cụm MỘT LƯỢT, gom các tín hiệu cho công thức:
  // - newest: bài mới nhất (độ tươi)
  // - src12h: NGUỒN có bài trong 12h qua (tốc độ lan truyền)
  // - tier1: có nguồn uy tín không
  // - usTitles/total: tỉ lệ tiêu đề "thuần Mỹ" (quá nửa → giảm điểm cả cụm)
  // PHÂN TRANG: Supabase trả tối đa 1000 dòng/truy vấn; .order('id') để trang ổn
  // định — phân trang KHÔNG order có thể trả trùng/sót dòng (sót → cụm bị đóng oan).
  interface Sig { newest: number; src12h: Set<string>; tier1: boolean; usTitles: number; total: number }
  const sig = new Map<string, Sig>();
  const cutoff12h = current.getTime() - 12 * 3_600_000;
  for (let from = 0; ; from += 1000) {
    const { data: posts } = await client
      .from('posts')
      .select('cluster_id, published_at, source_id, title')
      .not('cluster_id', 'is', null)
      .order('id')
      .range(from, from + 999);
    for (const p of posts ?? []) {
      const t = new Date(p.published_at).getTime();
      let s = sig.get(p.cluster_id);
      if (!s) {
        s = { newest: 0, src12h: new Set(), tier1: false, usTitles: 0, total: 0 };
        sig.set(p.cluster_id, s);
      }
      if (t > s.newest) s.newest = t;
      if (t >= cutoff12h && p.source_id) s.src12h.add(p.source_id);
      const name = p.source_id ? srcName.get(p.source_id) : undefined;
      if (name && isTier1(name)) s.tier1 = true;
      s.total += 1;
      if (isUsOnly(p.title ?? '')) s.usTitles += 1;
    }
    if (!posts || posts.length < 1000) break;
  }

  // Tách cụm "đã nguội" (đóng) khỏi cụm "còn sống" (chấm điểm).
  const staleMs = STALE_DAYS * 24 * 3_600_000;
  const staleIds: string[] = [];
  const active: { id: string; n_sources: number; ageHours: number; opts: PressHeatOpts }[] = [];
  for (const c of clusters ?? []) {
    const s = sig.get(c.id);
    const freshMs = s?.newest ?? new Date(c.first_seen).getTime();
    const ageMs = Math.max(0, current.getTime() - freshMs);
    if (ageMs > staleMs) {
      staleIds.push(c.id);
      continue;
    }
    active.push({
      id: c.id,
      n_sources: c.n_sources,
      ageHours: ageMs / 3_600_000,
      opts: {
        newSources12h: s?.src12h.size ?? 0,
        hasTier1: s?.tier1 ?? false,
        usOnly: !!s && s.total > 0 && s.usTitles >= s.total / 2,
        firstSeenAgeHours: Math.max(0, current.getTime() - new Date(c.first_seen).getTime()) / 3_600_000,
      },
    });
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
          .update({ heat_score: pressHeat(c.n_sources, c.ageHours, c.opts) })
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
