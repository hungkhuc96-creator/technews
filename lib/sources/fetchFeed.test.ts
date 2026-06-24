import { describe, it, expect } from 'vitest';
import { fetchFeed } from './fetchFeed';

describe('fetchFeed', () => {
  it('trả về body text khi response OK', async () => {
    const fakeFetch = async () =>
      new Response('<rss>ok</rss>', { status: 200 });
    const body = await fetchFeed('https://example.com/feed', fakeFetch as typeof fetch);
    expect(body).toBe('<rss>ok</rss>');
  });

  it('ném lỗi khi status không OK', async () => {
    const fakeFetch = async () => new Response('nope', { status: 500 });
    await expect(
      fetchFeed('https://example.com/feed', fakeFetch as typeof fetch),
    ).rejects.toThrow('500');
  });
});
