import { describe, it, expect } from 'vitest';
import { siteJsonLd, articleJsonLd } from './jsonld';
import type { FeedItem } from '../feed/getFeed';

const item: FeedItem = {
  clusterId: 'abc-123',
  title: 'Original English title',
  url: 'https://www.theverge.com/example',
  sourceName: 'The Verge',
  publishedAt: '2026-07-04T02:00:00.000Z',
  updatedAt: '2026-07-04T08:30:00.000Z',
  nSources: 3,
  sources: [],
  authorName: null,
  metrics: {},
  text: null,
  sourceTypes: ['press'],
  heat: 1,
  titleVi: 'Tiêu đề tiếng Việt',
  imageUrl: 'https://cdn.example.com/anh.jpg',
  summary: 'Tóm tắt tiếng Việt.',
  bullets: [],
  rising: false,
  videoSummary: null,
};

describe('siteJsonLd', () => {
  it('có WebSite + NewsMediaOrganization, đúng ngôn ngữ vi', () => {
    const graph = (siteJsonLd() as any)['@graph'];
    const types = graph.map((n: any) => n['@type']);
    expect(types).toContain('WebSite');
    expect(types).toContain('NewsMediaOrganization');
    expect(graph.find((n: any) => n['@type'] === 'WebSite').inLanguage).toBe('vi');
    // WebSite phải trỏ về đúng tổ chức phát hành (nối bằng @id)
    const org = graph.find((n: any) => n['@type'] === 'NewsMediaOrganization');
    const site = graph.find((n: any) => n['@type'] === 'WebSite');
    expect(site.publisher['@id']).toBe(org['@id']);
  });
});

describe('articleJsonLd', () => {
  it('NewsArticle: headline tiếng Việt, ngày ISO, ghi công bài gốc (isBasedOn)', () => {
    const graph = (articleJsonLd(item) as any)['@graph'];
    const art = graph.find((n: any) => n['@type'] === 'NewsArticle');
    expect(art.headline).toBe('Tiêu đề tiếng Việt');
    expect(art.datePublished).toBe('2026-07-04T02:00:00.000Z');
    expect(art.dateModified).toBe('2026-07-04T08:30:00.000Z');
    expect(art.isBasedOn).toBe('https://www.theverge.com/example');
    expect(art.url).toContain('/tin/abc-123');
    expect(art.image).toEqual(['https://cdn.example.com/anh.jpg']);
  });

  it('không có updatedAt → dateModified rơi về datePublished; không ảnh → bỏ trường image', () => {
    const bare = { ...item, updatedAt: null, imageUrl: null, summary: null };
    const art = (articleJsonLd(bare) as any)['@graph'][0];
    expect(art.dateModified).toBe(bare.publishedAt);
    expect('image' in art).toBe(false);
    expect('description' in art).toBe(false);
  });

  it('BreadcrumbList 2 cấp: Trang chủ → bài viết', () => {
    const bc = (articleJsonLd(item) as any)['@graph'].find(
      (n: any) => n['@type'] === 'BreadcrumbList',
    );
    expect(bc.itemListElement).toHaveLength(2);
    expect(bc.itemListElement[0].name).toBe('Trang chủ');
    expect(bc.itemListElement[1].name).toBe('Tiêu đề tiếng Việt');
  });
});
