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
