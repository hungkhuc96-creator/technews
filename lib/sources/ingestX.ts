import { normalizeTweets } from './x';
import type { NormalizedPost } from '../types';

export interface XIngestDeps {
  runActor: (input: Record<string, unknown>) => Promise<unknown[]>;
  upsert: (posts: NormalizedPost[]) => Promise<number>;
  maxItems?: number;  // trần kết quả — giữ THẤP để tiết kiệm chi phí Apify (§13)
  // Dịch caption sang tiếng Việt (lưu vào title; text vẫn giữ bản gốc tiếng Anh).
  translate?: (text: string) => Promise<string>;
}

export async function ingestX(
  handles: string[],
  deps: XIngestDeps,
): Promise<{ fetched: number; inserted: number; error?: string }> {
  const maxItems = deps.maxItems ?? handles.length * 3;
  // 1 query Twitter gộp mọi handle (OR) + bỏ retweet/reply ngay tại nguồn → ÍT kết quả, rẻ.
  const query = `(${handles.map((h) => `from:${h}`).join(' OR ')}) -filter:retweets -filter:replies`;
  const input: Record<string, unknown> = {
    searchTerms: [query],
    sort: 'Latest',
    maxItems,
  };

  try {
    const items = await deps.runActor(input);
    let posts = normalizeTweets(items);
    // Dịch caption sang tiếng Việt: title = bản dịch, text = bản gốc tiếng Anh.
    if (deps.translate) {
      posts = await Promise.all(
        posts.map(async (p) => {
          try {
            const vi = (await deps.translate!(p.title)).trim();
            return vi ? { ...p, title: vi, text: p.text || p.title } : p;
          } catch {
            return p; // dịch lỗi thì giữ nguyên bản gốc
          }
        }),
      );
    }
    const inserted = await deps.upsert(posts);
    return { fetched: posts.length, inserted };
  } catch (err) {
    console.warn('[ingestX] lỗi:', err);
    return { fetched: 0, inserted: 0, error: err instanceof Error ? err.message : String(err) };
  }
}
