import Parser from 'rss-parser';
import type { NormalizedPost } from '../types';

export interface PressSource {
  name: string;
  feedUrl: string;
}

type ImageItem = {
  enclosure?: { url?: string; type?: string };
  mediaContent?: { $?: { url?: string; medium?: string } };
  mediaThumbnail?: { $?: { url?: string } };
  contentEncoded?: string;
  content?: string;
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Giới hạn độ dài đoạn trích để giữ tính "trích đoạn" (không lưu nguyên bài quá dài).
const MAX_TEXT = 4000;
function clampText(s: string): string {
  if (s.length <= MAX_TEXT) return s;
  const cut = s.slice(0, MAX_TEXT);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > MAX_TEXT * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

// Lấy ảnh thumbnail theo thứ tự: enclosure ảnh → media:content → media:thumbnail
// → ảnh <img> đầu tiên trong nội dung. Không có thì null.
function extractImage(item: ImageItem): string | null {
  if (item.enclosure?.url && (item.enclosure.type ?? '').startsWith('image')) {
    return item.enclosure.url;
  }
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  const html = item.contentEncoded ?? item.content ?? '';
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m ? m[1] : null;
}

export async function parsePressFeed(
  xml: string,
  source: PressSource,
): Promise<NormalizedPost[]> {
  const feed = await parser.parseString(xml);
  return (feed.items ?? []).map((item) => {
    const url = item.link ?? '';
    // Ưu tiên content:encoded (đoạn DÀI hơn — vài báo cấp gần cả bài), rồi mới
    // đến description/summary. Tất cả đều gỡ HTML + giới hạn độ dài bên dưới.
    const enc = (item as { contentEncoded?: string }).contentEncoded;
    const rawText = enc ?? item.content ?? item.contentSnippet ?? item.summary ?? '';
    const isoDate =
      item.isoDate ??
      (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString());
    return {
      sourceType: 'press',
      sourceName: source.name,
      externalId: item.guid ?? url,
      title: (item.title ?? '').trim(),
      text: clampText(stripHtml(rawText)),
      url,
      author: item.creator ?? (item as { author?: string }).author ?? null,
      publishedAt: isoDate,
      lang: null,
      metrics: {},
      imageUrl: extractImage(item as ImageItem),
    } satisfies NormalizedPost;
  });
}
