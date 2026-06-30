import type { SupabaseClient } from '@supabase/supabase-js';

// Dịch tiêu đề (eager) cho các cụm báo chí đang mở mà CHƯA có title_vi.
// Ghi 1 dòng cluster_summaries với title_vi + summary rỗng (placeholder) — phần
// tóm tắt đầy đủ sẽ tạo sau (eager top-N hoặc lazy lúc bấm). Vì summary_vi/input_hash
// là NOT NULL nên dùng chuỗi rỗng làm placeholder (đọc ra sẽ chuẩn hóa ''→null).
export async function runTranslateTitles(
  client: SupabaseClient,
  translateBatch: (titles: string[]) => Promise<string[]>,
  opts: { limit?: number } = {},
): Promise<{ translated: number }> {
  // CHỈ xét top cụm theo độ nóng (những cụm thật sự lên feed). Quan trọng: tránh
  // .in() với hàng trăm UUID (URL quá dài → "fetch failed") và đỡ tốn tiền dịch.
  const limit = opts.limit ?? 80;
  const { data: clusters, error } = await client
    .from('clusters')
    .select('id, representative_post_id')
    .eq('status', 'open')
    .order('heat_score', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`runTranslateTitles đọc clusters lỗi: ${error.message}`);

  const ids = (clusters ?? []).map((c) => c.id);
  if (!ids.length) return { translated: 0 };

  const { data: existing } = await client
    .from('cluster_summaries')
    .select('cluster_id, title_vi')
    .in('cluster_id', ids);
  const haveTitle = new Set((existing ?? []).filter((e) => e.title_vi).map((e) => e.cluster_id));

  const todo = (clusters ?? []).filter(
    (c) => !haveTitle.has(c.id) && c.representative_post_id,
  );
  if (!todo.length) return { translated: 0 };

  const repIds = todo.map((c) => c.representative_post_id);
  const { data: posts } = await client.from('posts').select('id, title').in('id', repIds);
  const titleById = new Map((posts ?? []).map((p) => [p.id, p.title as string]));

  const titles = todo.map((c) => titleById.get(c.representative_post_id) ?? '');
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
