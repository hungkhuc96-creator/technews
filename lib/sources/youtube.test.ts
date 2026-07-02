import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseYoutubeFeed, resolveChannelId } from './youtube';

const xml = readFileSync(
  fileURLToPath(new URL('./__fixtures__/youtube.xml', import.meta.url)),
  'utf-8',
);

describe('resolveChannelId', () => {
  it('rút channelId từ HTML trang kênh', () => {
    expect(resolveChannelId('...<meta itemprop="identifier" content="UCabc123">...')).toBe('UCabc123');
    expect(resolveChannelId('x "channelId":"UCxyz789" y')).toBe('UCxyz789');
    expect(resolveChannelId('không có gì')).toBeNull();
  });

  it('ưu tiên externalId/canonical của CHÍNH kênh — không vớ "channelId" của kênh giới thiệu', () => {
    // Trang MKBHD từng chứa "channelId" của kênh phụ (The Studio) ĐỨNG TRƯỚC id chính chủ.
    const html =
      '"channelId":"UCkenhphu000" ... "externalId":"UCchinhchu11" ... ' +
      '<link rel="canonical" href="https://www.youtube.com/channel/UCchinhchu11">';
    expect(resolveChannelId(html)).toBe('UCchinhchu11');
    // Không có externalId thì lấy theo link canonical.
    const html2 = '"channelId":"UCkenhphu000" <link rel="canonical" href="https://www.youtube.com/channel/UCcanonical1">';
    expect(resolveChannelId(html2)).toBe('UCcanonical1');
  });
});

describe('parseYoutubeFeed', () => {
  it('chuẩn hóa video về NormalizedPost (thumbnail suy từ videoId)', async () => {
    const posts = await parseYoutubeFeed(xml, { name: 'MKBHD' });
    expect(posts).toHaveLength(2);
    const p = posts[0];
    expect(p.sourceType).toBe('youtube');
    expect(p.sourceName).toBe('MKBHD');
    expect(p.externalId).toBe('ABC12345xyz');
    expect(p.title).toBe('Đánh giá nhanh MacBook Pro M5');
    expect(p.url).toBe('https://www.youtube.com/watch?v=ABC12345xyz');
    expect(p.imageUrl).toBe('https://i.ytimg.com/vi/ABC12345xyz/hqdefault.jpg');
    expect(p.publishedAt).toBe('2026-06-23T10:00:00.000Z');
  });

  it('lấy views nếu có, không có thì metrics rỗng', async () => {
    const posts = await parseYoutubeFeed(xml, { name: 'MKBHD' });
    expect(posts[0].metrics.views).toBe(125000);
    expect(posts[1].metrics.views).toBeUndefined();
  });
});
