import { SITE_URL } from '../site';
import type { FeedItem } from '../feed/getFeed';

// JSON-LD (schema.org) — "giấy tờ tuỳ thân" máy đọc được của site. Google dùng
// NewsArticle để xét vào Top Stories/tab Tin tức; WebSite + NewsMediaOrganization
// định danh thương hiệu "peek" cho cả Google lẫn AI (Perplexity, ChatGPT search).
// THUẦN (không DB/mạng) → test được.

const ORG_ID = `${SITE_URL}/#org`;

// Khối toàn site — nhúng 1 lần ở layout.
export function siteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsMediaOrganization',
        '@id': ORG_ID,
        name: 'peek',
        alternateName: 'peek.vn — Liếc phát biết',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` },
        description:
          'peek tổng hợp tin công nghệ nước ngoài, gộp tin cùng sự kiện từ nhiều nguồn và tóm tắt bằng tiếng Việt.',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'peek',
        url: SITE_URL,
        inLanguage: 'vi',
        publisher: { '@id': ORG_ID },
      },
    ],
  };
}

// Khối cho từng trang tin /tin/[id] — NewsArticle + BreadcrumbList.
export function articleJsonLd(item: FeedItem): object {
  const url = `${SITE_URL}/tin/${item.clusterId}`;
  const headline = item.titleVi ?? item.title;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline,
        ...(item.summary ? { description: item.summary } : {}),
        ...(item.imageUrl ? { image: [item.imageUrl] } : {}),
        datePublished: item.publishedAt,
        dateModified: item.updatedAt ?? item.publishedAt,
        inLanguage: 'vi',
        mainEntityOfPage: url,
        url,
        // Chuỗi ghi công: bài này tóm tắt/dựa trên bài gốc của nguồn phát hành.
        isBasedOn: item.url,
        author: { '@type': 'Organization', name: 'peek', url: SITE_URL },
        publisher: { '@id': ORG_ID },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: headline, item: url },
        ],
      },
    ],
  };
}
