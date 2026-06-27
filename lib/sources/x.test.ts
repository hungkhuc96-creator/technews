import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeTweets } from './x';

const items = JSON.parse(
  readFileSync(fileURLToPath(new URL('./__fixtures__/x.json', import.meta.url)), 'utf-8'),
);

describe('normalizeTweets', () => {
  it('bỏ retweet và reply, chỉ giữ tweet gốc', () => {
    const out = normalizeTweets(items);
    expect(out).toHaveLength(1);
    expect(out[0].externalId).toBe('1001');
  });

  it('bỏ tweet rác: quá ngắn VÀ không có link (giữ tweet ngắn có link)', () => {
    const base = { createdAt: '2026-06-26T10:00:00.000Z', isRetweet: false, isReply: false, author: { userName: 'u' } };
    const out = normalizeTweets([
      { ...base, id: 'a', text: 'Amazing 🤩' },                                   // rác → bỏ
      { ...base, id: 'b', text: 'Madness' },                                       // rác → bỏ
      { ...base, id: 'e', text: 'https://t.co/onlylink' },                          // chỉ có link, rỗng chữ → bỏ
      { ...base, id: 'c', text: 'Tin lớn https://t.co/xyz' },                      // ngắn NHƯNG có link → giữ
      { ...base, id: 'd', text: 'Apple vừa công bố dòng MacBook Pro M5 hoàn toàn mới' }, // dài → giữ
    ]);
    expect(out.map((p) => p.externalId)).toEqual(['c', 'd']);
  });

  it('cắt link t.co khỏi tiêu đề/nội dung tweet', () => {
    const out = normalizeTweets([
      {
        id: '9', text: 'Tin lớn về M5 https://t.co/abc123XY',
        createdAt: '2026-06-26T10:00:00.000Z', isRetweet: false, isReply: false,
        author: { userName: 'verge', name: 'The Verge' },
      },
    ]);
    expect(out[0].title).toBe('Tin lớn về M5');
  });

  it('map đúng các trường: nguồn @handle, metrics, ngày', () => {
    const [p] = normalizeTweets(items);
    expect(p.sourceType).toBe('x');
    expect(p.sourceName).toBe('@MKBHD');
    expect(p.title).toBe('New video on the M5 MacBook Pro is live!');
    expect(p.url).toBe('https://x.com/MKBHD/status/1001');
    expect(p.metrics).toEqual({ likes: 3400, reposts: 120, comments: 45 });
    expect(p.publishedAt).toBe('2026-06-26T10:00:00.000Z');
    expect(p.lang).toBe('en');
  });
});
