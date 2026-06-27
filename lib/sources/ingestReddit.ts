import { parseRedditListing, type RedditSource } from './reddit';
import { fetchFeed, type FetchImpl } from './fetchFeed';
import type { NormalizedPost } from '../types';

export interface RedditIngestDeps {
  token: string; // OAuth app-only token (xem getAppToken)
  fetchImpl?: FetchImpl;
  upsert: (posts: NormalizedPost[]) => Promise<number>;
}

export async function ingestReddit(
  sources: RedditSource[],
  deps: RedditIngestDeps,
): Promise<{ fetched: number; inserted: number; failedSources: string[] }> {
  let fetched = 0;
  let inserted = 0;
  const failedSources: string[] = [];

  for (const source of sources) {
    try {
      // Endpoint OAuth trả CÙNG cấu trúc JSON với .json công khai → dùng lại parser.
      const url = `https://oauth.reddit.com/r/${source.subreddit}/hot?limit=20`;
      const json = await fetchFeed(url, deps.fetchImpl, { authorization: `Bearer ${deps.token}` });
      const posts = parseRedditListing(json, source);
      fetched += posts.length;
      inserted += await deps.upsert(posts);
    } catch (err) {
      console.warn(`[ingestReddit] bỏ qua "${source.name}":`, err);
      failedSources.push(source.name);
    }
  }

  return { fetched, inserted, failedSources };
}
