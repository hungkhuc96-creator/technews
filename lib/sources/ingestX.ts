import { normalizeTweets } from './x';
import type { NormalizedPost } from '../types';

export interface XIngestDeps {
  runActor: (input: Record<string, unknown>) => Promise<unknown[]>;
  upsert: (posts: NormalizedPost[]) => Promise<number>;
  maxItems?: number;  // trần kết quả — giữ THẤP để tiết kiệm chi phí Apify (§13)
  sinceDays?: number; // chỉ lấy tweet trong N ngày gần đây (lọc theo ngày)
}

export async function ingestX(
  handles: string[],
  deps: XIngestDeps,
): Promise<{ fetched: number; inserted: number; error?: string }> {
  const maxItems = deps.maxItems ?? handles.length * 3;
  const input: Record<string, unknown> = {
    twitterHandles: handles,
    maxItems,
    sort: 'Latest',
  };
  if (deps.sinceDays && deps.sinceDays > 0) {
    const since = new Date(Date.now() - deps.sinceDays * 24 * 3600 * 1000);
    input.start = since.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  try {
    const items = await deps.runActor(input);
    const posts = normalizeTweets(items);
    const inserted = await deps.upsert(posts);
    return { fetched: posts.length, inserted };
  } catch (err) {
    console.warn('[ingestX] lỗi:', err);
    return { fetched: 0, inserted: 0, error: err instanceof Error ? err.message : String(err) };
  }
}
