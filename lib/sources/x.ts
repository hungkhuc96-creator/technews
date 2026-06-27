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

// Bỏ link t.co (link rút gọn của Twitter) khỏi text + gọn khoảng trắng.
function cleanText(s: string): string {
  return s.replace(/https?:\/\/t\.co\/\S+/g, '').replace(/\s+/g, ' ').trim();
}

// Tweet "rác": quá ngắn VÀ không kèm link. Tweet ngắn có link thường trỏ tới
// bài báo nên giữ lại; còn các câu phản ứng kiểu "Amazing"/"Madness" thì bỏ.
function isJunk(t: Tweet): boolean {
  const raw = t.text ?? '';
  const hasLink = /https?:\/\//.test(raw);
  return !hasLink && cleanText(raw).length < 40;
}

// Chuẩn hóa tweet → NormalizedPost. Bỏ retweet, reply và tweet rác (giữ tín hiệu gốc).
// X xếp theo ĐỘ MỚI (getFeed dùng recencyHeat cho source_type 'x') — metrics chỉ để hiển thị.
export function normalizeTweets(items: unknown[]): NormalizedPost[] {
  return (items as Tweet[])
    .filter((t) => t && t.id && !t.isRetweet && !t.isReply && !isJunk(t))
    .map((t) => {
      const handle = t.author?.userName ?? 'unknown';
      const cleanedText = cleanText(t.text ?? '');
      const metrics: NormalizedPost['metrics'] = {};
      if (t.likeCount) metrics.likes = t.likeCount;
      if (t.retweetCount) metrics.reposts = t.retweetCount;
      if (t.replyCount) metrics.comments = t.replyCount;
      return {
        sourceType: 'x',
        sourceName: `@${handle}`,
        externalId: String(t.id),
        title: cleanedText,
        text: cleanedText,
        url: t.url ?? t.twitterUrl ?? `https://x.com/${handle}/status/${t.id}`,
        author: t.author?.name ?? null,
        publishedAt: new Date(t.createdAt ?? Date.now()).toISOString(),
        lang: t.lang ?? null,
        metrics,
        imageUrl: null,
      } satisfies NormalizedPost;
    });
}
