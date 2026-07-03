import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './url';

describe('normalizeUrl', () => {
  it('bỏ tham số theo dõi utm_* và fbclid', () => {
    expect(normalizeUrl('https://example.com/tin?utm_source=twitter&utm_medium=x'))
      .toBe('https://example.com/tin');
    expect(normalizeUrl('https://example.com/tin?fbclid=abc123'))
      .toBe('https://example.com/tin');
  });

  it('giữ lại tham số THẬT của bài', () => {
    expect(normalizeUrl('https://example.com/tin?id=42&utm_source=x'))
      .toBe('https://example.com/tin?id=42');
  });

  it('bỏ fragment và dấu / thừa cuối, hạ host về chữ thường', () => {
    expect(normalizeUrl('https://Example.com/tin/#phan-2')).toBe('https://example.com/tin');
  });

  it('quy 2 biến thể tracking của CÙNG bài về một url', () => {
    const a = normalizeUrl('https://vd.com/apple-m5?utm_campaign=rss');
    const b = normalizeUrl('https://vd.com/apple-m5?fbclid=zzz#top');
    expect(a).toBe(b);
  });

  it('url hỏng → trả nguyên bản', () => {
    expect(normalizeUrl('không-phải-url')).toBe('không-phải-url');
  });
});
