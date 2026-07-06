import { parseHnFrontPage, HN_SEARCH_URL, HN_MIN_POINTS } from './hackernews';
import { fetchFeed, type FetchImpl } from './fetchFeed';
import { isNoise } from './isDeal';
import type { NormalizedPost } from '../types';

export interface HnIngestDeps {
  upsert: (posts: NormalizedPost[]) => Promise<number>;
  fetchImpl?: FetchImpl;
  minPoints?: number;
  // Dịch tiêu đề sang tiếng Việt (title = bản dịch; link bài gốc vẫn ở text).
  translate?: (text: string) => Promise<string>;
}

export async function ingestHn(
  deps: HnIngestDeps,
): Promise<{ fetched: number; inserted: number; error?: string }> {
  try {
    const json = await fetchFeed(HN_SEARCH_URL, deps.fetchImpl);
    let posts = parseHnFrontPage(json, deps.minPoints ?? HN_MIN_POINTS)
      .filter((p) => !isNoise(p.title));
    if (deps.translate) {
      posts = await Promise.all(
        posts.map(async (p) => {
          try {
            const vi = (await deps.translate!(p.title)).trim();
            return vi ? { ...p, title: vi } : p;
          } catch {
            return p; // dịch lỗi (hết credit...) → giữ tiếng Anh, không chặn nạp
          }
        }),
      );
    }
    const inserted = await deps.upsert(posts);
    return { fetched: posts.length, inserted };
  } catch (err) {
    console.warn('[ingestHn] lỗi:', err);
    return { fetched: 0, inserted: 0, error: err instanceof Error ? err.message : String(err) };
  }
}
