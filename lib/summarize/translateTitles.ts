import type { SupabaseClient } from '@supabase/supabase-js';

// Dịch tiêu đề (eager) cho MỌI cụm báo chí đang mở mà CHƯA có title_vi — người
// đọc không bao giờ gặp tiêu đề tiếng Anh, kể cả khi cuộn sâu. Mỗi lượt cron chỉ
// còn cụm MỚI nên rẻ; backfill lần đầu dịch một thể.
// Ghi 1 dòng cluster_summaries với title_vi + summary rỗng (placeholder) — phần
// tóm tắt đầy đủ sẽ tạo sau. summary_vi/input_hash NOT NULL nên dùng '' làm
// placeholder (đọc ra chuẩn hóa ''→null).
export async function runTranslateTitles(
  client: SupabaseClient,
  translateBatch: (titles: string[]) => Promise<string[]>,
  opts: { limit?: number } = {},
): Promise<{ translated: number }> {
  // Đọc TẤT CẢ cụm mở theo trang (Supabase trả tối đa 1000 dòng/truy vấn).
  const clusters: { id: string; representative_post_id: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('clusters')
      .select('id, representative_post_id')
      .eq('status', 'open')
      .order('heat_score', { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error(`runTranslateTitles đọc clusters lỗi: ${error.message}`);
    clusters.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  // opts.limit: cho phép giới hạn (test / chạy thử); mặc định dịch hết.
  const scope = opts.limit ? clusters.slice(0, opts.limit) : clusters;
  if (!scope.length) return { translated: 0 };

  // Cụm nào ĐÃ có title_vi — hỏi theo lô 100 id (URL .in() quá dài sẽ "fetch failed").
  const haveTitle = new Set<string>();
  for (let i = 0; i < scope.length; i += 100) {
    const ids = scope.slice(i, i + 100).map((c) => c.id);
    const { data } = await client
      .from('cluster_summaries')
      .select('cluster_id, title_vi')
      .in('cluster_id', ids);
    for (const e of data ?? []) if (e.title_vi) haveTitle.add(e.cluster_id);
  }

  const todo = scope.filter((c) => !haveTitle.has(c.id) && c.representative_post_id);
  if (!todo.length) return { translated: 0 };

  // Tiêu đề gốc của bài đại diện — cũng hỏi theo lô.
  const titleById = new Map<string, string>();
  for (let i = 0; i < todo.length; i += 100) {
    const repIds = todo.slice(i, i + 100).map((c) => c.representative_post_id!);
    const { data } = await client.from('posts').select('id, title').in('id', repIds);
    for (const p of data ?? []) titleById.set(p.id, p.title as string);
  }

  const titles = todo.map((c) => titleById.get(c.representative_post_id!) ?? '');
  const vi = await translateBatch(titles);

  let translated = 0;
  for (let i = 0; i < todo.length; i++) {
    const t = (vi[i] ?? '').trim();
    if (!t || t === titles[i]) continue; // rỗng hoặc dịch == gốc (hỏng) → không lưu
    await client.from('cluster_summaries').upsert(
      { cluster_id: todo[i].id, title_vi: t, summary_vi: '', bullets_vi: [], input_hash: '' },
      { onConflict: 'cluster_id', ignoreDuplicates: true }, // không đè dòng đã có tóm tắt
    );
    translated++;
  }
  return { translated };
}
