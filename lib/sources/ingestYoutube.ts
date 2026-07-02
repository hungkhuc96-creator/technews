import { resolveChannelId, parseYoutubeFeed, type YoutubeSource } from './youtube';
import { fetchFeed, type FetchImpl } from './fetchFeed';
import type { NormalizedPost } from '../types';

export interface YtIngestDeps {
  fetchImpl?: FetchImpl;
  upsert: (posts: NormalizedPost[]) => Promise<number>;
  // Dịch tiêu đề video sang tiếng Việt (theo LÔ — 1 lần gọi cho cả kênh).
  // Khi có: title = bản dịch tiếng Việt, text = tiêu đề gốc tiếng Anh.
  translateTitles?: (titles: string[]) => Promise<string[]>;
  // Cập nhật LẠI lượt xem cho video ĐÃ có trong DB (upsert bỏ qua bài trùng nên
  // metrics đóng băng tại lần crawl đầu) — xếp hạng phản ánh view mới nhất.
  refreshMetrics?: (posts: NormalizedPost[]) => Promise<number>;
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
      let posts = await parseYoutubeFeed(xml, source);
      fetched += posts.length;
      // Dịch tiêu đề sang tiếng Việt: title = bản dịch, text = tiêu đề gốc tiếng Anh.
      if (deps.translateTitles && posts.length) {
        try {
          const vi = await deps.translateTitles(posts.map((p) => p.title));
          posts = posts.map((p, i) => {
            const t = (vi[i] ?? '').trim();
            return t ? { ...p, title: t, text: p.text || p.title } : p;
          });
        } catch (err) {
          console.warn(`[ingestYoutube] dịch tiêu đề "${source.name}" lỗi, giữ bản gốc:`, err);
        }
      }
      inserted += await deps.upsert(posts);
      // Sau upsert (bài trùng bị bỏ qua) → làm tươi lượt xem của các bài đã tồn tại.
      if (deps.refreshMetrics) {
        try {
          await deps.refreshMetrics(posts);
        } catch (err) {
          console.warn(`[ingestYoutube] refreshMetrics "${source.name}" lỗi (bỏ qua):`, err);
        }
      }
    } catch (err) {
      console.warn(`[ingestYoutube] bỏ qua "${source.name}":`, err);
      failedSources.push(source.name);
    }
  }

  return { fetched, inserted, failedSources };
}
