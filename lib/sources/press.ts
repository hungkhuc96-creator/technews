import Parser from 'rss-parser';
import type { NormalizedPost } from '../types';

export interface PressSource {
  name: string;
  feedUrl: string;
}

const parser = new Parser();

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function parsePressFeed(
  xml: string,
  source: PressSource,
): Promise<NormalizedPost[]> {
  const feed = await parser.parseString(xml);
  return (feed.items ?? []).map((item) => {
    const url = item.link ?? '';
    const rawText = item.contentSnippet ?? item.content ?? item.summary ?? '';
    const isoDate =
      item.isoDate ??
      (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString());
    return {
      sourceType: 'press',
      sourceName: source.name,
      externalId: item.guid ?? url,
      title: (item.title ?? '').trim(),
      text: stripHtml(rawText),
      url,
      author: item.creator ?? item.author ?? null,
      publishedAt: isoDate,
      lang: null,
      metrics: {},
    } satisfies NormalizedPost;
  });
}
