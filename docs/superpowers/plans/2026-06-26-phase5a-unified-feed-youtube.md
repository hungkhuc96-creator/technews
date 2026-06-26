# Phase 5a: Feed đa nguồn hợp nhất + YouTube — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng kiến trúc feed hợp nhất (cụm báo chí + bài đứng riêng từ nguồn khác, xếp chung), và thêm **YouTube** làm nguồn đứng-riêng đầu tiên (qua RSS kênh, không cần API key).

**Architecture:** YouTube/Reddit/X/TikTok là **bài đứng riêng** (không gom cụm) — mỗi bài là một card. getFeed gộp 2 loại ứng viên: cụm báo chí (đã có heat_score) + bài non-press (tính heat tại chỗ theo loại), **chuẩn hóa mỗi loại về 0–100** rồi xếp chung. YouTube lấy qua RSS kênh (`feeds/videos.xml`), thumbnail suy ra từ video ID nên luôn có ảnh.

**Tech Stack:** TypeScript, Vitest, `rss-parser` (đọc RSS YouTube — định dạng Atom), Supabase, Next.js. Không thêm credential.

## Global Constraints

- Ngôn ngữ **TypeScript**, Node ≥ 20; Next.js App Router.
- **YouTube/Reddit/X/TikTok luôn ĐỨNG RIÊNG** (không gom cụm); chỉ báo chí mới gom cụm.
- Heat: YouTube/Reddit/TikTok = engagement tuyệt đối `log10(1+metric)/(age+2)^1.5`; X = độ mới `1/(age+2)^1.5`; nếu thiếu engagement thì lùi về độ mới. Báo chí dùng heat cụm sẵn có.
- **Trộn feed:** chuẩn hóa heat mỗi loại về 0–100 rồi xếp chung.
- `NormalizedPost` chung cho mọi nguồn; adapter cắm-rút + degrade (nguồn lỗi bỏ qua).
- TDD; mỗi task một commit.

---

### Task 1: Hàm độ nóng cho nguồn đứng riêng (engagement + độ mới)

**Files:**
- Modify: `lib/score/heat.ts`
- Modify: `lib/score/heat.test.ts`

**Interfaces:**
- Produces:
  - `function engagementHeat(metric: number, ageHours: number): number`
  - `function recencyHeat(ageHours: number): number`

- [ ] **Step 1: Thêm test (vào cuối `lib/score/heat.test.ts`)**

```ts
import { engagementHeat, recencyHeat } from './heat';

describe('engagementHeat', () => {
  it('= log10(1 + metric) / (age + 2)^1.5', () => {
    expect(engagementHeat(999, 0)).toBeCloseTo(Math.log10(1000) / Math.pow(2, 1.5), 5);
  });
  it('nhiều engagement hơn → nóng hơn (cùng tuổi)', () => {
    expect(engagementHeat(10000, 5)).toBeGreaterThan(engagementHeat(100, 5));
  });
  it('cũ hơn → nguội hơn', () => {
    expect(engagementHeat(1000, 0)).toBeGreaterThan(engagementHeat(1000, 20));
  });
});

describe('recencyHeat', () => {
  it('= 1 / (age + 2)^1.5; mới hơn nóng hơn', () => {
    expect(recencyHeat(0)).toBeCloseTo(1 / Math.pow(2, 1.5), 5);
    expect(recencyHeat(0)).toBeGreaterThan(recencyHeat(10));
  });
});
```

- [ ] **Step 2: Chạy cho chắc FAIL**

Run: `npm test lib/score/heat.test.ts`
Expected: FAIL — `engagementHeat`/`recencyHeat` chưa export.

- [ ] **Step 3: Thêm vào `lib/score/heat.ts` (giữ nguyên `pressHeat`)**

```ts
export function engagementHeat(metric: number, ageHours: number): number {
  return Math.log10(1 + Math.max(0, metric)) / Math.pow(ageHours + 2, TIME_GRAVITY);
}

export function recencyHeat(ageHours: number): number {
  return 1 / Math.pow(ageHours + 2, TIME_GRAVITY);
}
```

- [ ] **Step 4: Chạy cho PASS**

Run: `npm test lib/score/heat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/score/heat.ts lib/score/heat.test.ts
git commit -m "feat: hàm độ nóng engagement + độ mới cho nguồn đứng riêng"
```

---

### Task 2: Đọc & chuẩn hóa RSS YouTube

**Files:**
- Create: `lib/sources/youtube.ts`
- Create: `lib/sources/__fixtures__/youtube.xml`
- Test: `lib/sources/youtube.test.ts`

**Interfaces:**
- Consumes: `NormalizedPost` (`lib/types.ts`).
- Produces:
  - `interface YoutubeSource { name: string; channelUrl: string }` (channelUrl = trang kênh, vd `https://www.youtube.com/@mkbhd`)
  - `function resolveChannelId(html: string): string | null` (rút channelId từ HTML trang kênh)
  - `async function parseYoutubeFeed(xml: string, source: { name: string }): Promise<NormalizedPost[]>`

- [ ] **Step 1: Tạo fixture Atom feed YouTube**

Tạo `lib/sources/__fixtures__/youtube.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <title>MKBHD</title>
  <entry>
    <id>yt:video:ABC12345xyz</id>
    <yt:videoId>ABC12345xyz</yt:videoId>
    <title>Đánh giá nhanh MacBook Pro M5</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=ABC12345xyz" />
    <published>2026-06-23T10:00:00+00:00</published>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/ABC12345xyz/hqdefault.jpg" />
      <media:community>
        <media:statistics views="125000" />
      </media:community>
    </media:group>
  </entry>
  <entry>
    <id>yt:video:DEF67890uvw</id>
    <yt:videoId>DEF67890uvw</yt:videoId>
    <title>So kè RTX 5070 vs RX 9070 XT</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=DEF67890uvw" />
    <published>2026-06-22T08:00:00+00:00</published>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/DEF67890uvw/hqdefault.jpg" />
    </media:group>
  </entry>
</feed>
```

- [ ] **Step 2: Viết test fail**

Tạo `lib/sources/youtube.test.ts`:

```ts
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
```

- [ ] **Step 3: Chạy cho chắc FAIL**

Run: `npm test lib/sources/youtube.test.ts`
Expected: FAIL — không tìm thấy module `./youtube`.

- [ ] **Step 4: Viết `lib/sources/youtube.ts`**

```ts
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
export function resolveChannelId(html: string): string | null {
  const m =
    /"channelId":"(UC[\w-]+)"/.exec(html) ??
    /itemprop="identifier"\s+content="(UC[\w-]+)"/.exec(html);
  return m ? m[1] : null;
}

function videoIdOf(item: { id?: string }): string {
  return (item.id ?? '').split(':').pop() ?? '';
}

function viewsOf(item: { mediaGroup?: unknown }): number {
  const g = item.mediaGroup as
    | { 'media:community'?: { 'media:statistics'?: { $?: { views?: string } } } }
    | undefined;
  const v = Number(g?.['media:community']?.['media:statistics']?.$?.views ?? 0);
  return Number.isFinite(v) ? v : 0;
}

export async function parseYoutubeFeed(
  xml: string,
  source: { name: string },
): Promise<NormalizedPost[]> {
  const feed = await parser.parseString(xml);
  return (feed.items ?? []).map((item) => {
    const vid = videoIdOf(item);
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
```

- [ ] **Step 5: Chạy cho PASS**

Run: `npm test lib/sources/youtube.test.ts`
Expected: PASS — 5 test xanh.

> Nếu test `views` fail (rss-parser lồng `media:group` khác dự kiến): điều chỉnh `viewsOf` theo cấu trúc thực mà `console.log(item.mediaGroup)` in ra, rồi chạy lại. Thumbnail (suy từ videoId) là phần chắc chắn nhất.

- [ ] **Step 6: Commit**

```bash
git add lib/sources/youtube.ts lib/sources/youtube.test.ts lib/sources/__fixtures__/youtube.xml
git commit -m "feat: đọc & chuẩn hóa RSS YouTube (thumbnail từ videoId, views nếu có)"
```

---

### Task 3: Orchestrator ingest YouTube + seed + script

**Files:**
- Create: `lib/sources/youtubeSeeds.ts`
- Create: `lib/sources/ingestYoutube.ts`
- Test: `lib/sources/ingestYoutube.test.ts`
- Create: `scripts/ingest-youtube.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `resolveChannelId`/`parseYoutubeFeed`/`YoutubeSource` (Task 2), `fetchFeed`/`FetchImpl` (Phase 1), `upsertPosts` (Phase 1).
- Produces:
  - `const YOUTUBE_SOURCES: YoutubeSource[]`
  - `interface YtIngestDeps { fetchImpl?: FetchImpl; upsert: (posts: NormalizedPost[]) => Promise<number> }`
  - `async function ingestYoutube(sources: YoutubeSource[], deps: YtIngestDeps): Promise<{ fetched: number; inserted: number; failedSources: string[] }>`

- [ ] **Step 1: Viết `lib/sources/youtubeSeeds.ts`**

```ts
import type { YoutubeSource } from './youtube';

export const YOUTUBE_SOURCES: YoutubeSource[] = [
  { name: 'MKBHD', channelUrl: 'https://www.youtube.com/@mkbhd' },
  { name: 'Dave2D', channelUrl: 'https://www.youtube.com/@Dave2D' },
  { name: 'Mrwhosetheboss', channelUrl: 'https://www.youtube.com/@Mrwhosetheboss' },
  { name: 'HardwareCanucks', channelUrl: 'https://www.youtube.com/@HardwareCanucks' },
  { name: 'Max Tech', channelUrl: 'https://www.youtube.com/@MaxTechOfficial' },
  { name: 'Linus Tech Tips', channelUrl: 'https://www.youtube.com/@LinusTechTips' },
];
```

- [ ] **Step 2: Viết test fail (fetch giả: trang kênh → HTML có channelId; RSS → fixture)**

Tạo `lib/sources/ingestYoutube.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ingestYoutube } from './ingestYoutube';
import type { NormalizedPost } from '../types';

const ytXml = readFileSync(
  fileURLToPath(new URL('./__fixtures__/youtube.xml', import.meta.url)),
  'utf-8',
);

// fetch giả: URL trang kênh trả HTML chứa channelId; URL feed trả fixture.
const fakeFetch = (async (url: string) => {
  if (url.includes('/feeds/videos.xml')) return new Response(ytXml, { status: 200 });
  return new Response('... "channelId":"UCfake123" ...', { status: 200 });
}) as typeof fetch;

describe('ingestYoutube', () => {
  it('giải channelId → đọc RSS → upsert, trả thống kê', async () => {
    const inserted: NormalizedPost[] = [];
    const result = await ingestYoutube(
      [{ name: 'MKBHD', channelUrl: 'https://www.youtube.com/@mkbhd' }],
      { fetchImpl: fakeFetch, upsert: async (p) => { inserted.push(...p); return p.length; } },
    );
    expect(result.fetched).toBe(2);
    expect(result.inserted).toBe(2);
    expect(inserted[0].sourceType).toBe('youtube');
  });

  it('kênh không giải được channelId thì bỏ qua (degrade)', async () => {
    const noId = (async () => new Response('không có id', { status: 200 })) as typeof fetch;
    const result = await ingestYoutube(
      [{ name: 'X', channelUrl: 'https://www.youtube.com/@x' }],
      { fetchImpl: noId, upsert: async (p) => p.length },
    );
    expect(result.failedSources).toEqual(['X']);
    expect(result.inserted).toBe(0);
  });
});
```

- [ ] **Step 3: Chạy cho chắc FAIL**

Run: `npm test lib/sources/ingestYoutube.test.ts`
Expected: FAIL — không tìm thấy `./ingestYoutube`.

- [ ] **Step 4: Viết `lib/sources/ingestYoutube.ts`**

```ts
import { resolveChannelId, parseYoutubeFeed, type YoutubeSource } from './youtube';
import { fetchFeed, type FetchImpl } from './fetchFeed';
import type { NormalizedPost } from '../types';

export interface YtIngestDeps {
  fetchImpl?: FetchImpl;
  upsert: (posts: NormalizedPost[]) => Promise<number>;
}

export async function ingestYoutube(
  sources: YoutubeSource[],
  deps: YtIngestDeps,
): Promise<{ fetched: number; inserted: number; failedSources: string[] }> {
  let fetched = 0;
  let inserted = 0;
  const failedSources: string[] = [];

  for (const source of sources) {
    try {
      const html = await fetchFeed(source.channelUrl, deps.fetchImpl);
      const channelId = resolveChannelId(html);
      if (!channelId) throw new Error('không giải được channelId');
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const xml = await fetchFeed(feedUrl, deps.fetchImpl);
      const posts = await parseYoutubeFeed(xml, source);
      fetched += posts.length;
      inserted += await deps.upsert(posts);
    } catch (err) {
      console.warn(`[ingestYoutube] bỏ qua "${source.name}":`, err);
      failedSources.push(source.name);
    }
  }

  return { fetched, inserted, failedSources };
}
```

- [ ] **Step 5: Chạy cho PASS**

Run: `npm test lib/sources/ingestYoutube.test.ts`
Expected: PASS — 2 test xanh.

- [ ] **Step 6: Viết script `scripts/ingest-youtube.ts`**

```ts
import { createServiceClient } from '../lib/db/client.js';
import { upsertPosts } from '../lib/db/posts.js';
import { ingestYoutube } from '../lib/sources/ingestYoutube.js';
import { YOUTUBE_SOURCES } from '../lib/sources/youtubeSeeds.js';

async function main() {
  const client = createServiceClient();
  const result = await ingestYoutube(YOUTUBE_SOURCES, {
    upsert: (posts) => upsertPosts(client, posts),
  });
  console.log('Ingest YouTube xong:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Thêm script:
```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && npm pkg set scripts.ingest:youtube="node --env-file=.env.local --import tsx scripts/ingest-youtube.ts"
```

- [ ] **Step 7: Commit**

```bash
git add lib/sources/youtubeSeeds.ts lib/sources/ingestYoutube.ts lib/sources/ingestYoutube.test.ts scripts/ingest-youtube.ts package.json
git commit -m "feat: orchestrator ingest YouTube (giải channelId + RSS) + seed + script"
```

---

### Task 4: Feed hợp nhất — trộn cụm báo chí + bài đứng riêng

**Files:**
- Create: `lib/feed/rank.ts`
- Test: `lib/feed/rank.test.ts`
- Modify: `lib/feed/getFeed.ts`
- Modify: `lib/feed/getFeed.test.ts`

**Interfaces:**
- Produces:
  - `interface RankCandidate<T> { item: T; bucket: string; rawHeat: number }`
  - `function rankCandidates<T>(cands: RankCandidate<T>[], limit: number): T[]` (chuẩn hóa rawHeat theo bucket về 0–1, xếp giảm dần, cắt limit)

- [ ] **Step 1: Viết test fail cho `rankCandidates`**

Tạo `lib/feed/rank.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rankCandidates } from './rank';

describe('rankCandidates', () => {
  it('chuẩn hóa theo bucket: top mỗi loại đứng ngang nhau', () => {
    const out = rankCandidates(
      [
        { item: 'press-top', bucket: 'press', rawHeat: 0.05 },   // top press → 1.0
        { item: 'press-low', bucket: 'press', rawHeat: 0.01 },   // 0.2
        { item: 'yt-top', bucket: 'youtube', rawHeat: 3.0 },     // top youtube → 1.0
        { item: 'yt-low', bucket: 'youtube', rawHeat: 1.5 },     // 0.5
      ],
      10,
    );
    // hai "top" của 2 loại đứng đầu (thứ tự giữa chúng không quan trọng), rồi yt-low (0.5), rồi press-low (0.2)
    expect(out.slice(0, 2).sort()).toEqual(['press-top', 'yt-top']);
    expect(out[2]).toBe('yt-low');
    expect(out[3]).toBe('press-low');
  });

  it('cắt theo limit', () => {
    const out = rankCandidates(
      [1, 2, 3].map((n) => ({ item: n, bucket: 'a', rawHeat: n })),
      2,
    );
    expect(out).toEqual([3, 2]);
  });
});
```

- [ ] **Step 2: Chạy cho chắc FAIL**

Run: `npm test lib/feed/rank.test.ts`
Expected: FAIL — không tìm thấy `./rank`.

- [ ] **Step 3: Viết `lib/feed/rank.ts`**

```ts
export interface RankCandidate<T> {
  item: T;
  bucket: string;
  rawHeat: number;
}

export function rankCandidates<T>(cands: RankCandidate<T>[], limit: number): T[] {
  const maxByBucket = new Map<string, number>();
  for (const c of cands) {
    maxByBucket.set(c.bucket, Math.max(maxByBucket.get(c.bucket) ?? 0, c.rawHeat));
  }
  return cands
    .map((c) => {
      const max = maxByBucket.get(c.bucket) ?? 0;
      return { item: c.item, score: max > 0 ? c.rawHeat / max : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
```

- [ ] **Step 4: Chạy cho PASS**

Run: `npm test lib/feed/rank.test.ts`
Expected: PASS.

- [ ] **Step 5: Sửa `lib/feed/getFeed.ts` để gộp bài non-press**

Thêm import ở đầu file:
```ts
import { rankCandidates, type RankCandidate } from './rank';
import { engagementHeat, recencyHeat } from '../score/heat';
```

Sau khi đã dựng xong mảng các `FeedItem` của cụm báo chí (đặt tên biến là `pressItems`
— gói toàn bộ logic hiện có vào một biến mảng thay vì `return` trực tiếp), thêm phần
non-press và trộn. Thay `return ...` cuối hàm bằng:

```ts
  // Ứng viên cụm báo chí
  const candidates: RankCandidate<FeedItem>[] = pressItems.map((it) => ({
    item: it,
    bucket: 'press',
    rawHeat: it.heat,
  }));

  // Ứng viên bài đứng riêng (YouTube/Reddit/X/TikTok) — 7 ngày gần nhất
  const now = Date.now();
  const since = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
  const { data: standalone } = await client
    .from('posts')
    .select('id, source_type, title, url, published_at, image_url, metrics, sources(name)')
    .neq('source_type', 'press')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(200);

  for (const p of standalone ?? []) {
    const ageHours = Math.max(0, (now - new Date(p.published_at).getTime()) / 3_600_000);
    const m = (p.metrics ?? {}) as { views?: number; upvotes?: number };
    const eng = Number(m.views ?? m.upvotes ?? 0);
    const rawHeat =
      p.source_type === 'x' || eng <= 0 ? recencyHeat(ageHours) : engagementHeat(eng, ageHours);
    const sName = Array.isArray(p.sources) ? (p.sources[0]?.name ?? null) : ((p.sources as any)?.name ?? null);
    const item: FeedItem = {
      clusterId: p.id,
      title: p.title,
      url: p.url,
      sourceName: sName,
      publishedAt: p.published_at,
      nSources: 1,
      sourceTypes: [p.source_type],
      heat: rawHeat,
      titleVi: null,
      imageUrl: p.image_url ?? null,
      summary: null,
      bullets: [],
    };
    candidates.push({ item, bucket: p.source_type, rawHeat });
  }

  return rankCandidates(candidates, limit);
```

> Lưu ý: phần dựng `pressItems` chính là đoạn `(clusters ?? []).map(...).filter(...)`
> hiện có — đổi từ `return (clusters ?? [])...` thành `const pressItems = (clusters ?? [])...`.

- [ ] **Step 6: Cập nhật `lib/feed/getFeed.test.ts`**

Test hiện tại chỉ có cụm báo chí (không có bài non-press) nên vẫn đúng: `hotId`
(rawHeat 5) chuẩn hóa trong bucket 'press' = 1.0 đứng trước `coldId` (0.1 → 0.02).
Các khẳng định cũ (thứ tự hot trước cold, title/summary/bullets/thumbnail) **giữ nguyên,
vẫn pass**. Không cần sửa.

- [ ] **Step 7: Chạy toàn bộ test**

Run: `npm test`
Expected: tất cả xanh (gồm rank + getFeed cũ).

- [ ] **Step 8: Commit**

```bash
git add lib/feed/rank.ts lib/feed/rank.test.ts lib/feed/getFeed.ts
git commit -m "feat: feed hợp nhất — trộn cụm báo chí + bài đứng riêng, chuẩn hóa theo loại"
```

---

### Task 5: Chạy thật + xem YouTube trên web

**Files:** (không sửa code — chạy + kiểm chứng)

- [ ] **Step 1: Lấy video YouTube thật về DB**

Run: `npm run ingest:youtube`
Expected: in `Ingest YouTube xong: { fetched: N, inserted: M, failedSources: [...] }` với N > 0.
(Mỗi kênh: 1 lần tải trang kênh để giải channelId + 1 lần tải RSS.)

Kiểm tra:
```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && node --env-file=.env.local --input-type=module -e "
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { count } = await c.from('posts').select('*',{count:'exact',head:true}).eq('source_type','youtube');
console.log('Video YouTube trong DB:', count);
const { data } = await c.from('posts').select('title,image_url,metrics').eq('source_type','youtube').limit(3);
for (const v of data) console.log(' •', v.title.slice(0,50), '| views', v.metrics?.views ?? '?', '|', v.image_url);
"
```
Expected: vài video, có `image_url` (i.ytimg.com).

- [ ] **Step 2: Xem trên web**

Run: `npm run dev` → mở `http://localhost:3000`.
Expected: feed giờ có **card YouTube** (icon ▶, thumbnail video) xen lẫn cụm báo chí,
xếp theo độ nóng đã chuẩn hóa.

- [ ] **Step 3: Commit (nếu có chỉnh seed/URL khi chạy thật)**

```bash
git add -A && git commit -m "chore: chạy thật ingest YouTube (Phase 5a)" || echo "không có thay đổi"
```

---

## Định nghĩa hoàn thành Phase 5a

- `npm test` xanh toàn bộ (engagement/recency heat, parseYoutubeFeed, ingestYoutube, rankCandidates, getFeed).
- `npm run ingest:youtube` lấy được video thật vào DB (có thumbnail + views).
- Web hiển thị card YouTube xen lẫn cụm báo chí, xếp theo độ nóng chuẩn hóa.

## Bước tiếp theo (các nguồn còn lại — kế hoạch riêng)

- **Phase 5b: Reddit** (qua `r/{sub}/hot.json` hoặc API chính thức) — pattern adapter giống hệt.
- **Phase 5c: X (Apify)** + **Phase 5d: TikTok (Apify)** — cần Apify token; theo §13 spec (since_id/maxItems).
- (Tùy chọn) Tóm tắt AI tiếng Việt cho card non-press; trang chi tiết card.
