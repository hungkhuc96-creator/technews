import { describe, it, expect } from 'vitest';
import { parseHnFrontPage, HN_MIN_POINTS } from './hackernews';

const FIXTURE = JSON.stringify({
  hits: [
    {
      objectID: '41001',
      title: 'Apple releases M5 MacBook Pro with 2nm chip',
      url: 'https://www.apple.com/newsroom/m5',
      points: 312,
      num_comments: 187,
      author: 'tosh',
      created_at: '2026-07-05T08:00:00.000Z',
      _tags: ['story', 'front_page'],
    },
    {
      objectID: '41002',
      title: 'Ask HN: Best laptop for local LLMs in 2026?',
      url: null, // Ask HN không có link ngoài
      points: 95,
      num_comments: 240,
      author: 'devguy',
      created_at: '2026-07-05T09:00:00.000Z',
      _tags: ['story', 'ask_hn', 'front_page'],
    },
    {
      objectID: '41003',
      title: 'Chưa đủ chín — mới lên trang nhất',
      url: 'https://example.com',
      points: 12, // dưới ngưỡng 50
      num_comments: 3,
      author: 'newbie',
      created_at: '2026-07-05T10:00:00.000Z',
      _tags: ['story', 'front_page'],
    },
    {
      objectID: '41004',
      title: 'Senior Engineer at Stripe (job)',
      points: 80,
      author: 'stripe',
      created_at: '2026-07-05T10:00:00.000Z',
      _tags: ['job', 'front_page'], // không phải story → loại
    },
  ],
});

describe('parseHnFrontPage', () => {
  it('giữ story đủ điểm, loại bài non điểm và tin tuyển dụng', () => {
    const posts = parseHnFrontPage(FIXTURE);
    expect(posts.map((p) => p.externalId)).toEqual(['41001', '41002']);
  });

  it('map đúng trường: url = trang THẢO LUẬN, metrics có điểm + comment', () => {
    const [apple] = parseHnFrontPage(FIXTURE);
    expect(apple.sourceType).toBe('hn');
    expect(apple.sourceName).toBe('Hacker News');
    expect(apple.url).toBe('https://news.ycombinator.com/item?id=41001');
    expect(apple.text).toBe('https://www.apple.com/newsroom/m5'); // link gốc giữ ở text
    expect(apple.metrics).toEqual({ upvotes: 312, comments: 187 });
    expect(apple.publishedAt).toBe('2026-07-05T08:00:00.000Z');
  });

  it('ngưỡng điểm chỉnh được (minPoints param)', () => {
    expect(parseHnFrontPage(FIXTURE, 10)).toHaveLength(3);
    expect(HN_MIN_POINTS).toBe(50);
  });
});
