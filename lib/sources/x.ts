import type { NormalizedPost } from '../types';

// Một item tweet từ actor apidojo/tweet-scraper (chỉ các trường ta dùng).
interface Tweet {
  id?: string;
  url?: string;
  twitterUrl?: string;
  text?: string;
  createdAt?: string;
  lang?: string;
  retweetCount?: number;
  replyCount?: number;
  likeCount?: number;
  isRetweet?: boolean;
  isReply?: boolean;
  author?: { userName?: string; name?: string };
}

// Chuẩn hóa tweet → NormalizedPost. Bỏ retweet & reply (giữ tín hiệu gốc).
// X xếp theo ĐỘ MỚI (getFeed dùng recencyHeat cho source_type 'x') — metrics chỉ để hiển thị.
export function normalizeTweets(items: unknown[]): NormalizedPost[] {
  return (items as Tweet[])
    .filter((t) => t && t.id && !t.isRetweet && !t.isReply)
    .map((t) => {
      const handle = t.author?.userName ?? 'unknown';
      const metrics: NormalizedPost['metrics'] = {};
      if (t.likeCount) metrics.likes = t.likeCount;
      if (t.retweetCount) metrics.reposts = t.retweetCount;
      if (t.replyCount) metrics.comments = t.replyCount;
      return {
        sourceType: 'x',
        sourceName: `@${handle}`,
        externalId: String(t.id),
        title: (t.text ?? '').trim(),
        text: (t.text ?? '').trim(),
        url: t.url ?? t.twitterUrl ?? `https://x.com/${handle}/status/${t.id}`,
        author: t.author?.name ?? null,
        publishedAt: new Date(t.createdAt ?? Date.now()).toISOString(),
        lang: t.lang ?? null,
        metrics,
        imageUrl: null,
      } satisfies NormalizedPost;
    });
}
