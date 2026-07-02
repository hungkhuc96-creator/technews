import Parser from 'rss-parser';
import type { NormalizedPost } from '../types';

export interface YoutubeSource {
  name: string;
  channelUrl: string; // trang kênh, vd https://www.youtube.com/@mkbhd
}

const parser = new Parser({
  customFields: {
    item: [['media:group', 'mediaGroup']],
  },
});

// Rút channelId (UC...) từ HTML trang kênh YouTube.
// QUAN TRỌNG: phải ưu tiên marker CHÍNH CHỦ của kênh (externalId / link canonical /
// itemprop) — "channelId" chung chung xuất hiện nhiều lần trong HTML và cái đầu tiên
// có thể là KÊNH KHÁC được giới thiệu (vd trang MKBHD từng giải nhầm ra "The Studio").
export function resolveChannelId(html: string): string | null {
  const m =
    /"externalId":"(UC[\w-]+)"/.exec(html) ??
    /rel="canonical"\s+href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]+)"/.exec(html) ??
    /itemprop="identifier"\s+content="(UC[\w-]+)"/.exec(html) ??
    /"channelId":"(UC[\w-]+)"/.exec(html);
  return m ? m[1] : null;
}

function videoIdOf(item: { id?: string }): string {
  return (item.id ?? '').split(':').pop() ?? '';
}

function viewsOf(item: { mediaGroup?: unknown }): number {
  // rss-parser bọc các thẻ con thành mảng.
  const g = item.mediaGroup as
    | { 'media:community'?: Array<{ 'media:statistics'?: Array<{ $?: { views?: string } }> }> }
    | undefined;
  const raw = g?.['media:community']?.[0]?.['media:statistics']?.[0]?.$?.views;
  const v = Number(raw ?? 0);
  return Number.isFinite(v) ? v : 0;
}

export async function parseYoutubeFeed(
  xml: string,
  source: { name: string },
): Promise<NormalizedPost[]> {
  const feed = await parser.parseString(xml);
  return (feed.items ?? []).map((item) => {
    const vid = videoIdOf(item as { id?: string });
    const views = viewsOf(item as { mediaGroup?: unknown });
    const isoDate =
      item.isoDate ??
      (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString());
    return {
      sourceType: 'youtube',
      sourceName: source.name,
      externalId: vid || item.link || '',
      title: (item.title ?? '').trim(),
      text: '',
      url: item.link ?? `https://www.youtube.com/watch?v=${vid}`,
      author: null,
      publishedAt: isoDate,
      lang: null,
      metrics: views > 0 ? { views } : {},
      imageUrl: vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : null,
    } satisfies NormalizedPost;
  });
}
