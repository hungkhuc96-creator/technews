import { parsePressFeed, type PressSource } from './press';
import { fetchFeed, type FetchImpl } from './fetchFeed';
import { isDeal } from './isDeal';
import type { NormalizedPost } from '../types';

export interface IngestDeps {
  fetchImpl?: FetchImpl;
  upsert: (posts: NormalizedPost[]) => Promise<number>;
}

export async function ingestPress(
  sources: PressSource[],
  deps: IngestDeps,
): Promise<{ fetched: number; inserted: number; failedSources: string[] }> {
  let fetched = 0;
  let inserted = 0;
  const failedSources: string[] = [];

  for (const source of sources) {
    try {
      const xml = await fetchFeed(source.feedUrl, deps.fetchImpl);
      // Lọc bỏ tin deals/khuyến mãi ngay tại nguồn — không cho vào DB.
      const posts = (await parsePressFeed(xml, source)).filter((p) => !isDeal(p.title));
      fetched += posts.length;
      inserted += await deps.upsert(posts);
    } catch (err) {
      console.warn(`[ingestPress] bỏ qua nguồn "${source.name}":`, err);
      failedSources.push(source.name);
    }
  }

  return { fetched, inserted, failedSources };
}
