import type { NormalizedPost } from '../types';

export interface RedditSource {
  name: string;       // hiển thị, vd "r/technology"
  subreddit: string;  // tên sub, vd "technology"
}

interface RedditChild {
  kind: string;
  data: {
    id: string;
    title: string;
    permalink: string;
    created_utc: number;
    ups?: number;
    num_comments?: number;
    author?: string;
    stickied?: boolean;
    thumbnail?: string;
    preview?: { images?: Array<{ source?: { url?: string } }> };
  };
}

// Ảnh: ưu tiên preview (giải mã &amp;), nếu không có thì dùng thumbnail khi là URL thật.
function imageOf(d: RedditChild['data']): string | null {
  const preview = d.preview?.images?.[0]?.source?.url;
  if (preview) return preview.replace(/&amp;/g, '&');
  const thumb = d.thumbnail ?? '';
  return thumb.startsWith('http') ? thumb : null;
}

export function parseRedditListing(json: string, source: RedditSource): NormalizedPost[] {
  const parsed = JSON.parse(json) as { data?: { children?: RedditChild[] } };
  const children = parsed.data?.children ?? [];
  return children
    .filter((c) => c.kind === 't3' && !c.data.stickied)
    .map((c) => {
      const d = c.data;
      const upvotes = Number(d.ups ?? 0);
      const comments = Number(d.num_comments ?? 0);
      const metrics: NormalizedPost['metrics'] = {};
      if (upvotes > 0) metrics.upvotes = upvotes;
      if (comments > 0) metrics.comments = comments;
      return {
        sourceType: 'reddit',
        sourceName: source.name,
        externalId: d.id,
        title: (d.title ?? '').trim(),
        text: '',
        url: `https://www.reddit.com${d.permalink}`,
        author: d.author ?? null,
        publishedAt: new Date((d.created_utc ?? 0) * 1000).toISOString(),
        lang: null,
        metrics,
        imageUrl: imageOf(d),
      } satisfies NormalizedPost;
    });
}

// ==== Đường RSS công khai (không cần key) ====
// Reddit khoá JSON công khai (403 từ 6/2026) và API tự do phải chờ duyệt.
// RSS /hot/.rss vẫn mở: có tiêu đề + link + thời gian (KHÔNG có số upvote —
// feed sẽ xếp các bài này theo độ mới như X). /hot đã được Reddit xếp sẵn theo
// độ nóng nên bản thân việc bài lọt vào feed đã là tín hiệu chất lượng.
import Parser from 'rss-parser';

const rssParser = new Parser({
  customFields: { item: [['media:thumbnail', 'mediaThumbnail']] },
});

export async function parseRedditFeed(xml: string, source: RedditSource): Promise<NormalizedPost[]> {
  const feed = await rssParser.parseString(xml);
  return (feed.items ?? [])
    .map((item) => {
      const rawId = (item as { id?: string }).id ?? item.guid ?? item.link ?? '';
      const thumb = (item as { mediaThumbnail?: { $?: { url?: string } } }).mediaThumbnail?.$?.url;
      return {
        sourceType: 'reddit',
        sourceName: source.name,
        externalId: rawId.replace(/^t3_/, ''), // khớp id thời OAuth để không trùng bài
        title: (item.title ?? '').trim(),
        text: '',
        url: item.link ?? '',
        author: ((item as { author?: string }).author ?? item.creator ?? null) as string | null,
        publishedAt: item.isoDate ?? new Date().toISOString(),
        lang: 'en',
        metrics: {}, // RSS không có upvote — xếp theo độ mới
        imageUrl: thumb && thumb.startsWith('http') ? thumb : null,
      } satisfies NormalizedPost;
    })
    .filter((p) => p.title && p.url);
}
