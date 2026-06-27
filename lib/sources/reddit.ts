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
