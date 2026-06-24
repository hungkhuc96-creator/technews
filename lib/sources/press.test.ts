import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parsePressFeed } from './press';

const xml = readFileSync(
  fileURLToPath(new URL('./__fixtures__/verge.xml', import.meta.url)),
  'utf-8',
);
const source = { name: 'The Verge', feedUrl: 'https://www.theverge.com/rss/index.xml' };

describe('parsePressFeed', () => {
  it('chuẩn hóa từng item về NormalizedPost', async () => {
    const posts = await parsePressFeed(xml, source);
    expect(posts).toHaveLength(2);
    const first = posts[0];
    expect(first.sourceType).toBe('press');
    expect(first.sourceName).toBe('The Verge');
    expect(first.title).toBe('OpenAI ra mắt GPT-5.2');
    expect(first.url).toBe('https://www.theverge.com/gpt-5-2');
    expect(first.externalId).toBe('https://www.theverge.com/gpt-5-2');
    expect(first.author).toBe('Jane Doe');
    expect(first.publishedAt).toBe('2026-06-23T04:00:00.000Z');
    expect(first.metrics).toEqual({});
  });

  it('gỡ HTML khỏi description', async () => {
    const posts = await parsePressFeed(xml, source);
    expect(posts[0].text).toBe('Mô hình mới dẫn đầu benchmark.');
  });

  it('item thiếu author → null', async () => {
    const posts = await parsePressFeed(xml, source);
    expect(posts[1].author).toBeNull();
  });
});
