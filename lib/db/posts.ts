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
