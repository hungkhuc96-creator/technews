import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseRedditListing } from './reddit';

const json = readFileSync(
  fileURLToPath(new URL('./__fixtures__/reddit.json', import.meta.url)),
  'utf-8',
);

describe('parseRedditListing', () => {
  it('chuẩn hóa bài link/self, bỏ bài ghim (stickied)', () => {
    const posts = parseRedditListing(json, { name: 'r/technology', subreddit: 'technology' });
    expect(posts).toHaveLength(2); // bỏ megathread ghim
    const ids = posts.map((p) => p.externalId);
    expect(ids).toEqual(['abc123', 'def456']);
  });

  it('map đúng các trường: url thread, upvote/comment, ngày, ảnh', () => {
    const [p] = parseRedditListing(json, { name: 'r/technology', subreddit: 'technology' });
    expect(p.sourceType).toBe('reddit');
    expect(p.sourceName).toBe('r/technology');
    expect(p.title).toBe('Apple announces M5 MacBook Pro');
    expect(p.url).toBe('https://www.reddit.com/r/technology/comments/abc123/apple_announces_m5/');
    expect(p.metrics).toEqual({ upvotes: 4521, comments: 312 });
    expect(p.publishedAt).toBe(new Date(1750000000 * 1000).toISOString());
    // ảnh lấy từ preview, đã giải mã &amp; → &
    expect(p.imageUrl).toBe('https://preview.redd.it/m5.jpg?width=640&auto=webp&s=abc');
  });

  it('bài self không có preview thì ảnh = null (thumbnail "self" không phải URL)', () => {
    const [, p2] = parseRedditListing(json, { name: 'r/technology', subreddit: 'technology' });
    expect(p2.imageUrl).toBeNull();
  });
});
