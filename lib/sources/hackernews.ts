import type { NormalizedPost } from '../types';

// Hacker News qua API Algolia (hn.algolia.com) — CÔNG KHAI, KHÔNG CẦN KEY.
// Lấy trang nhất (front_page = đã được cộng đồng HN "bầu" lên) rồi lọc thêm
// theo điểm vote để chỉ tin thực sự được quan tâm mới vào feed.

export const HN_SEARCH_URL =
  'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30';

// Ngưỡng điểm tối thiểu — trang nhất HN vẫn có bài mới leo lên với điểm thấp,
// chờ nó "chín" (≥50 điểm) mới đưa vào feed cho chắc tín hiệu.
export const HN_MIN_POINTS = 50;

interface HnHit {
  objectID: string;
  title?: string | null;
  url?: string | null;          // link bài gốc (có thể null với Ask HN)
  points?: number | null;
  num_comments?: number | null;
  author?: string | null;
  created_at?: string | null;   // ISO 8601
  _tags?: string[];
}

export function parseHnFrontPage(json: string, minPoints = HN_MIN_POINTS): NormalizedPost[] {
  const parsed = JSON.parse(json) as { hits?: HnHit[] };
  return (parsed.hits ?? [])
    .filter((h) => {
      if (!h.title?.trim()) return false;
      if (!(h._tags ?? []).includes('story')) return false; // bỏ job/poll
      return Number(h.points ?? 0) >= minPoints;
    })
    .map((h) => {
      const metrics: NormalizedPost['metrics'] = {};
      const points = Number(h.points ?? 0);
      const comments = Number(h.num_comments ?? 0);
      if (points > 0) metrics.upvotes = points;
      if (comments > 0) metrics.comments = comments;
      return {
        sourceType: 'hn',
        sourceName: 'Hacker News',
        externalId: h.objectID,
        title: (h.title ?? '').trim(),
        // Giá trị của HN là THẢO LUẬN — url trỏ về trang bàn luận (bài gốc
        // thường đã có trong cụm báo chí; text giữ link gốc để tham khảo).
        text: h.url ?? '',
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        author: h.author ?? null,
        publishedAt: h.created_at ?? new Date().toISOString(),
        lang: 'en',
        metrics,
        imageUrl: null,
      } satisfies NormalizedPost;
    });
}
