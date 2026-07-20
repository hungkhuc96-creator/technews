import type { SupabaseClient } from '@supabase/supabase-js';

// Dịch BÙ tiêu đề X/YouTube bị kẹt tiếng Anh. Các bài này vốn dịch NGAY LÚC INGEST
// (title = bản dịch, text = bản gốc), nhưng nếu lúc đó hết credit Anthropic thì giữ
// nguyên bản gốc → title == text. upsertPosts cố tình ignoreDuplicates nên chạy lại
// ingest KHÔNG sửa được. Hàm này quét bài chưa dịch (title == text) và dịch bù.
// TỰ LÀNH: chạy mỗi lượt update-social; đã dịch rồi thì title != text nên bỏ qua,
// không tốn thêm credit.
export async function backfillStandaloneTitles(
  client: SupabaseClient,
  translateBatch: (titles: string[]) => Promise<string[]>,
  opts: { sinceDays?: number; limit?: number } = {},
): Promise<{ scanned: number; translated: number }> {
  const sinceDays = opts.sinceDays ?? 7;
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const { data, error } = await client
    .from('posts')
    .select('id, title, text')
    .in('source_type', ['x', 'youtube'])
    .gte('published_at', since)
    .limit(opts.limit ?? 300);
  if (error) throw new Error(`backfillStandaloneTitles đọc lỗi: ${error.message}`);

  // "Chưa dịch" = tiêu đề trùng nguyên văn gốc.
  const todo = (data ?? []).filter((p) => p.title && p.text && p.title === p.text);
  if (!todo.length) return { scanned: data?.length ?? 0, translated: 0 };

  const vi = await translateBatch(todo.map((p) => p.title as string));
  let translated = 0;
  for (let i = 0; i < todo.length; i++) {
    const t = (vi[i] ?? '').trim();
    if (!t || t === todo[i].title) continue; // dịch rỗng / không đổi (hỏng) → bỏ
    await client.from('posts').update({ title: t }).eq('id', todo[i].id);
    translated++;
  }
  return { scanned: data?.length ?? 0, translated };
}
