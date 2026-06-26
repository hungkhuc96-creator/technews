import { resolveChannelId, parseYoutubeFeed, type YoutubeSource } from './youtube';
import { fetchFeed, type FetchImpl } from './fetchFeed';
import type { NormalizedPost } from '../types';

export interface YtIngestDeps {
  fetchImpl?: FetchImpl;
  upsert: (posts: NormalizedPost[]) => Promise<number>;
}

export async function ingestYoutube(
  sources: YoutubeSource[],
  deps: YtIngestDeps,
): Promise<{ fetched: number; inserted: number; failedSources: string[] }> {
  let fetched = 0;
  let inserted = 0;
  const failedSources: string[] = [];

  for (const source of sources) {
    try {
      const html = await fetchFeed(source.channelUrl, deps.fetchImpl);
      const channelId = resolveChannelId(html);
      if (!channelId) throw new Error('không giải được channelId');
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const xml = await fetchFeed(feedUrl, deps.fetchImpl);
      const posts = await parseYoutubeFeed(xml, source);
      fetched += posts.length;
      inserted += await deps.upsert(posts);
    } catch (err) {
      console.warn(`[ingestYoutube] bỏ qua "${source.name}":`, err);
      failedSources.push(source.name);
    }
  }

  return { fetched, inserted, failedSources };
}
