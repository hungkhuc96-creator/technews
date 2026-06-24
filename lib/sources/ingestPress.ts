import { parsePressFeed, type PressSource } from './press';
import { fetchFeed, type FetchImpl } from './fetchFeed';
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
      const posts = await parsePressFeed(xml, source);
      fetched += posts.length;
      inserted += await deps.upsert(posts);
    } catch (err) {
      console.warn(`[ingestPress] bỏ qua nguồn "${source.name}":`, err);
      failedSources.push(source.name);
    }
  }

  return { fetched, inserted, failedSources };
}
