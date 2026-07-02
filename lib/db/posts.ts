import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedPost, SourceType } from '../types';

export async function ensureSource(
  client: SupabaseClient,
  sourceType: SourceType,
  name: string,
  config: Record<string, unknown> = {},
): Promise<string> {
  const { data, error } = await client
    .from('sources')
    .upsert({ type: sourceType, name, config }, { onConflict: 'type,name' })
    .select('id')
    .single();
  if (error) throw new Error(`ensureSource lỗi: ${error.message}`);
  return data.id as string;
}

export async function upsertPosts(
  client: SupabaseClient,
  posts: NormalizedPost[],
): Promise<number> {
  if (posts.length === 0) return 0;

  // Resolve source_id cho từng (sourceType, sourceName) duy nhất
  const sourceIds = new Map<string, string>();
  for (const p of posts) {
    const key = `${p.sourceType}::${p.sourceName}`;
    if (!sourceIds.has(key)) {
      sourceIds.set(key, await ensureSource(client, p.sourceType, p.sourceName));
    }
  }

  const rows = posts.map((p) => ({
    source_id: sourceIds.get(`${p.sourceType}::${p.sourceName}`),
    source_type: p.sourceType,
    external_id: p.externalId,
    title: p.title,
    text: p.text,
    url: p.url,
    author: p.author,
    published_at: p.publishedAt,
    lang: p.lang,
    metrics: p.metrics,
    image_url: p.imageUrl ?? null,
  }));

  const { data, error } = await client
    .from('posts')
    .upsert(rows, { onConflict: 'source_type,external_id', ignoreDuplicates: true })
    .select('id');
  if (error) throw new Error(`upsertPosts lỗi: ${error.message}`);
  return data?.length ?? 0;
}

// Cập nhật LẠI metrics (views/upvotes...) cho bài ĐÃ tồn tại — upsertPosts cố tình
// ignoreDuplicates để không đè tiêu đề đã dịch, nên metrics bị "đóng băng" tại lần
// crawl đầu (lúc video mới đăng, view còn thấp). Hàm này chỉ đụng cột metrics.
// Chỉ bài trong cửa sổ sinceDays (mặc định 7 ngày — đúng cửa sổ trộn feed) để đỡ tốn query.
export async function refreshMetrics(
  client: SupabaseClient,
  posts: NormalizedPost[],
  sinceDays = 7,
): Promise<number> {
  const cutoff = Date.now() - sinceDays * 24 * 3600 * 1000;
  const targets = posts.filter(
    (p) => Object.keys(p.metrics).length > 0 && new Date(p.publishedAt).getTime() >= cutoff,
  );
  let updated = 0;
  for (const p of targets) {
    const { data, error } = await client
      .from('posts')
      .update({ metrics: p.metrics })
      .eq('source_type', p.sourceType)
      .eq('external_id', p.externalId)
      .select('id');
    if (error) throw new Error(`refreshMetrics lỗi: ${error.message}`);
    updated += data?.length ?? 0;
  }
  return updated;
}
