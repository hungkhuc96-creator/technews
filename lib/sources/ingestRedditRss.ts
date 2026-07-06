import { parseRedditFeed, type RedditSource } from './reddit';
import { fetchFeed, type FetchImpl } from './fetchFeed';
import { isNoise } from './isDeal';
import type { NormalizedPost } from '../types';

export interface RedditRssIngestDeps {
  upsert: (posts: NormalizedPost[]) => Promise<number>;
  fetchImpl?: FetchImpl;
  translate?: (text: string) => Promise<string>;
  // Nghỉ giữa các subreddit — Reddit phạt 429 nếu gọi dồn dập (đo thật: 2,5s
  // vẫn dính). Cron chạy 4 tiếng/lần nên 12s/sub (~2 phút cho 10 sub) là ổn.
  delayMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function ingestRedditRss(
  sources: RedditSource[],
  deps: RedditRssIngestDeps,
): Promise<{ fetched: number; inserted: number; failedSources: string[] }> {
  let fetched = 0;
  let inserted = 0;
  const failedSources: string[] = [];
  const delayMs = deps.delayMs ?? 15_000;

  for (const [i, source] of sources.entries()) {
    try {
      if (i > 0) await sleep(delayMs);
      const url = `https://www.reddit.com/r/${source.subreddit}/hot/.rss?limit=15`;
      // UA tử tế — Reddit chặn UA mặc định của node rất gắt.
      const xml = await fetchFeed(url, deps.fetchImpl, {
        'user-agent': 'peek.vn news reader (+https://peek.vn/lien-he)',
      });
      let posts = (await parseRedditFeed(xml, source)).filter((p) => !isNoise(p.title));
      if (deps.translate) {
        posts = await Promise.all(
          posts.map(async (p) => {
            try {
              const vi = (await deps.translate!(p.title)).trim();
              return vi ? { ...p, title: vi, text: p.text || p.title } : p;
            } catch {
              return p; // dịch lỗi → giữ tiếng Anh, không chặn nạp
            }
          }),
        );
      }
      fetched += posts.length;
      inserted += await deps.upsert(posts);
    } catch (err) {
      console.warn(`[ingestRedditRss] bỏ qua "${source.name}":`, err);
      failedSources.push(source.name);
    }
  }

  return { fetched, inserted, failedSources };
}
