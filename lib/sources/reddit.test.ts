import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseRedditFeed, parseRedditListing } from './reddit';

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

describe('parseRedditFeed (Atom RSS công khai)', () => {
  const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <entry>
    <author><name>/u/techfan</name></author>
    <id>t3_abc123</id>
    <link href="https://www.reddit.com/r/apple/comments/abc123/m5_macbook/"/>
    <updated>2026-07-05T12:00:00+00:00</updated>
    <published>2026-07-05T11:00:00+00:00</published>
    <title>M5 MacBook Pro benchmarks leaked</title>
    <media:thumbnail url="https://b.thumbs.redditmedia.com/xyz.jpg"/>
  </entry>
  <entry>
    <id>t3_def456</id>
    <link href="https://www.reddit.com/r/apple/comments/def456/no_thumb/"/>
    <published>2026-07-05T10:00:00+00:00</published>
    <title>iOS 27 beta 3 released</title>
  </entry>
</feed>`;

  it('map đúng: id bỏ tiền tố t3_, url permalink, có thumbnail, không upvote', async () => {
    const posts = await parseRedditFeed(ATOM, { name: 'r/apple', subreddit: 'apple' });
    expect(posts).toHaveLength(2);
    expect(posts[0].externalId).toBe('abc123'); // khớp id thời OAuth
    expect(posts[0].sourceType).toBe('reddit');
    expect(posts[0].url).toContain('/comments/abc123/');
    expect(posts[0].imageUrl).toBe('https://b.thumbs.redditmedia.com/xyz.jpg');
    expect(posts[0].metrics).toEqual({}); // RSS không có vote → xếp theo độ mới
    expect(posts[1].imageUrl).toBeNull();
  });
});
