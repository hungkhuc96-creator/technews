export type SourceType = 'press' | 'youtube' | 'reddit' | 'x' | 'tiktok';

const SOURCE_TYPES: readonly SourceType[] = ['press', 'youtube', 'reddit', 'x', 'tiktok'];

export function isSourceType(value: string): value is SourceType {
  return (SOURCE_TYPES as readonly string[]).includes(value);
}

export interface PostMetrics {
  views?: number;
  upvotes?: number;
  comments?: number;
  likes?: number;
  reposts?: number;
}

export interface NormalizedPost {
  sourceType: SourceType;
  sourceName: string;
  externalId: string;
  title: string;
  text: string;
  url: string;
  author: string | null;
  publishedAt: string; // ISO 8601
  lang: string | null;
  metrics: PostMetrics;
  imageUrl?: string | null; // thumbnail (báo chí lấy từ RSS)
}
