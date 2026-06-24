# Phase 1: Xương sống dữ liệu + Ingest báo chí (RSS) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng project Next.js + TypeScript, định nghĩa schema database trên Supabase, và xây adapter báo chí RSS được test kỹ — lấy tin từ các feed báo chí, chuẩn hóa về `NormalizedPost`, và ghi vào Postgres (chống trùng).

**Architecture:** Logic thuần (parse/chuẩn hóa) tách khỏi I/O (fetch mạng, ghi DB) để test nhanh bằng fixture. Mỗi adapter nguồn là một module độc lập đổ về cùng một kiểu `NormalizedPost`. Phase 1 chỉ làm nguồn báo chí; YouTube/Reddit/X để Phase 5 (kiến trúc đã chừa chỗ).

**Tech Stack:** Next.js (App Router) + TypeScript, Vitest (test), `rss-parser` (đọc RSS), Supabase (Postgres + `pgvector`) qua `@supabase/supabase-js`, `tsx` (chạy script).

## Global Constraints

- Ngôn ngữ: **TypeScript**, Node ≥ 20.
- Framework: **Next.js App Router**.
- DB: **Supabase (Postgres)**, bật extension **`pgvector`**; cột embedding kiểu `vector(1536)`.
- Cột `embedding`, `entities`, `cluster_id` **chỉ dùng cho `source_type='press'`** (Phase 2+).
- Mọi adapter nguồn **cắm-rút + degrade**: một nguồn lỗi thì bỏ qua, không làm hỏng toàn bộ ingest.
- Bản quyền: chỉ lưu **tiêu đề + tóm tắt/trích đoạn + URL gốc**, KHÔNG lưu toàn văn bài báo.
- Chống trùng tin: khóa duy nhất `(source_type, external_id)`.
- Test trước (TDD): viết test fail → code tối thiểu cho pass → commit.

---

### Task 1: Scaffold project + kiểu `NormalizedPost`

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `lib/types.ts`
- Test: `lib/types.test.ts`

**Interfaces:**
- Produces:
  - `type SourceType = 'press' | 'youtube' | 'reddit' | 'x' | 'tiktok'`
  - `interface PostMetrics { views?: number; upvotes?: number; comments?: number; likes?: number; reposts?: number }`
  - `interface NormalizedPost { sourceType: SourceType; sourceName: string; externalId: string; title: string; text: string; url: string; author: string | null; publishedAt: string; lang: string | null; metrics: PostMetrics }`

- [ ] **Step 1: Khởi tạo project + cài dependencies**

```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews"
npm init -y
npm pkg set type="module"
npm install next@latest react@latest react-dom@latest @supabase/supabase-js rss-parser
npm install -D typescript @types/node @types/react vitest tsx
```

- [ ] **Step 2: Tạo `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Tạo `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
  },
});
```

Thêm script test vào `package.json`:

```bash
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
```

- [ ] **Step 4: Viết test fail cho `lib/types.ts`**

Tạo `lib/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { NormalizedPost } from './types';
import { isSourceType } from './types';

describe('types', () => {
  it('isSourceType nhận đúng 4 loại nguồn', () => {
    expect(isSourceType('press')).toBe(true);
    expect(isSourceType('youtube')).toBe(true);
    expect(isSourceType('reddit')).toBe(true);
    expect(isSourceType('x')).toBe(true);
    expect(isSourceType('tiktok')).toBe(true);
    expect(isSourceType('blog')).toBe(false);
  });

  it('NormalizedPost dựng được object hợp lệ', () => {
    const p: NormalizedPost = {
      sourceType: 'press',
      sourceName: 'The Verge',
      externalId: 'abc',
      title: 'Hello',
      text: 'world',
      url: 'https://x.com/a',
      author: null,
      publishedAt: '2026-06-24T00:00:00.000Z',
      lang: null,
      metrics: {},
    };
    expect(p.sourceType).toBe('press');
  });
});
```

- [ ] **Step 5: Chạy test cho chắc nó FAIL**

Run: `npm test`
Expected: FAIL — `Cannot find module './types'` (chưa tạo file).

- [ ] **Step 6: Tạo `lib/types.ts`**

```ts
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
}
```

- [ ] **Step 7: Chạy test cho PASS**

Run: `npm test`
Expected: PASS — 2 test xanh.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts lib/types.ts lib/types.test.ts
git commit -m "feat: scaffold Next.js+TS+Vitest và kiểu NormalizedPost"
```

---

### Task 2: Parse + chuẩn hóa RSS báo chí (logic thuần)

**Files:**
- Create: `lib/sources/press.ts`
- Test: `lib/sources/press.test.ts`
- Create (fixture): `lib/sources/__fixtures__/verge.xml`

**Interfaces:**
- Consumes: `NormalizedPost` (Task 1)
- Produces:
  - `interface PressSource { name: string; feedUrl: string }`
  - `async function parsePressFeed(xml: string, source: PressSource): Promise<NormalizedPost[]>`

- [ ] **Step 1: Tạo fixture RSS tối giản**

Tạo `lib/sources/__fixtures__/verge.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The Verge</title>
    <item>
      <title>OpenAI ra mắt GPT-5.2</title>
      <link>https://www.theverge.com/gpt-5-2</link>
      <guid>https://www.theverge.com/gpt-5-2</guid>
      <pubDate>Tue, 23 Jun 2026 04:00:00 GMT</pubDate>
      <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Jane Doe</dc:creator>
      <description><![CDATA[<p>Mô hình mới dẫn đầu benchmark.</p>]]></description>
    </item>
    <item>
      <title>Apple chốt sự kiện iPhone 17</title>
      <link>https://www.theverge.com/iphone-17</link>
      <guid>https://www.theverge.com/iphone-17</guid>
      <pubDate>Tue, 23 Jun 2026 02:00:00 GMT</pubDate>
      <description>Thư mời đã gửi.</description>
    </item>
  </channel>
</rss>
```

- [ ] **Step 2: Viết test fail cho `parsePressFeed`**

Tạo `lib/sources/press.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parsePressFeed } from './press';

const xml = readFileSync(
  fileURLToPath(new URL('./__fixtures__/verge.xml', import.meta.url)),
  'utf-8',
);
const source = { name: 'The Verge', feedUrl: 'https://www.theverge.com/rss/index.xml' };

describe('parsePressFeed', () => {
  it('chuẩn hóa từng item về NormalizedPost', async () => {
    const posts = await parsePressFeed(xml, source);
    expect(posts).toHaveLength(2);
    const first = posts[0];
    expect(first.sourceType).toBe('press');
    expect(first.sourceName).toBe('The Verge');
    expect(first.title).toBe('OpenAI ra mắt GPT-5.2');
    expect(first.url).toBe('https://www.theverge.com/gpt-5-2');
    expect(first.externalId).toBe('https://www.theverge.com/gpt-5-2');
    expect(first.author).toBe('Jane Doe');
    expect(first.publishedAt).toBe('2026-06-23T04:00:00.000Z');
    expect(first.metrics).toEqual({});
  });

  it('gỡ HTML khỏi description', async () => {
    const posts = await parsePressFeed(xml, source);
    expect(posts[0].text).toBe('Mô hình mới dẫn đầu benchmark.');
  });

  it('item thiếu author → null', async () => {
    const posts = await parsePressFeed(xml, source);
    expect(posts[1].author).toBeNull();
  });
});
```

- [ ] **Step 3: Chạy test cho chắc nó FAIL**

Run: `npm test lib/sources/press.test.ts`
Expected: FAIL — `Cannot find module './press'`.

- [ ] **Step 4: Viết `lib/sources/press.ts`**

```ts
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
```

- [ ] **Step 5: Chạy test cho PASS**

Run: `npm test lib/sources/press.test.ts`
Expected: PASS — 3 test xanh.

- [ ] **Step 6: Commit**

```bash
git add lib/sources/press.ts lib/sources/press.test.ts lib/sources/__fixtures__/verge.xml
git commit -m "feat: parse + chuẩn hóa RSS báo chí về NormalizedPost"
```

---

### Task 3: Lớp fetch feed (I/O, có thể tiêm fetch giả)

**Files:**
- Create: `lib/sources/fetchFeed.ts`
- Test: `lib/sources/fetchFeed.test.ts`

**Interfaces:**
- Produces:
  - `type FetchImpl = typeof fetch`
  - `async function fetchFeed(url: string, fetchImpl?: FetchImpl): Promise<string>`

- [ ] **Step 1: Viết test fail**

Tạo `lib/sources/fetchFeed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fetchFeed } from './fetchFeed';

describe('fetchFeed', () => {
  it('trả về body text khi response OK', async () => {
    const fakeFetch = async () =>
      new Response('<rss>ok</rss>', { status: 200 });
    const body = await fetchFeed('https://example.com/feed', fakeFetch as typeof fetch);
    expect(body).toBe('<rss>ok</rss>');
  });

  it('ném lỗi khi status không OK', async () => {
    const fakeFetch = async () => new Response('nope', { status: 500 });
    await expect(
      fetchFeed('https://example.com/feed', fakeFetch as typeof fetch),
    ).rejects.toThrow('500');
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó FAIL**

Run: `npm test lib/sources/fetchFeed.test.ts`
Expected: FAIL — `Cannot find module './fetchFeed'`.

- [ ] **Step 3: Viết `lib/sources/fetchFeed.ts`**

```ts
export type FetchImpl = typeof fetch;

export async function fetchFeed(
  url: string,
  fetchImpl: FetchImpl = fetch,
): Promise<string> {
  const res = await fetchImpl(url, {
    headers: { 'user-agent': 'nong-techfeed/0.1 (+https://example.com)' },
  });
  if (!res.ok) {
    throw new Error(`fetchFeed ${url} thất bại: HTTP ${res.status}`);
  }
  return await res.text();
}
```

- [ ] **Step 4: Chạy test cho PASS**

Run: `npm test lib/sources/fetchFeed.test.ts`
Expected: PASS — 2 test xanh.

- [ ] **Step 5: Commit**

```bash
git add lib/sources/fetchFeed.ts lib/sources/fetchFeed.test.ts
git commit -m "feat: lớp fetchFeed có thể tiêm fetch để test"
```

---

### Task 4: Schema database (Supabase migration)

**Prerequisite:** Cài Supabase CLI và Docker. Khởi tạo local stack:
```bash
npm install -D supabase
npx supabase init      # tạo thư mục supabase/
npx supabase start     # bật Postgres local; IN ra API URL + anon/service key
```
Ghi lại `API URL` và `service_role key` từ output để dùng ở Task 5.

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces (bảng + cột để Task 5 và các phase sau dùng):
  - `sources(id uuid pk, type text, name text, config jsonb, authority_weight real, created_at timestamptz)`
  - `posts(id uuid pk, source_id uuid fk, source_type text, external_id text, title text, text text, url text, author text, published_at timestamptz, lang text, metrics jsonb, entities text[], embedding vector(1536), cluster_id uuid, fetched_at timestamptz)` — UNIQUE `(source_type, external_id)`
  - `clusters`, `cluster_summaries`, `comments` (tạo sẵn cho phase sau)

- [ ] **Step 1: Viết migration**

Tạo `supabase/migrations/0001_init.sql`:

```sql
create extension if not exists vector;

create table sources (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('press','youtube','reddit','x','tiktok')),
  name text not null,
  config jsonb not null default '{}',          -- feed_url / channel_id / subreddit / x_handle
  authority_weight real not null default 1,
  created_at timestamptz not null default now(),
  unique (type, name)
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete set null,
  source_type text not null check (source_type in ('press','youtube','reddit','x','tiktok')),
  external_id text not null,
  title text not null,
  text text not null default '',
  url text not null,
  author text,
  published_at timestamptz not null,
  lang text,
  metrics jsonb not null default '{}',
  entities text[] not null default '{}',       -- chỉ dùng cho báo chí
  embedding vector(1536),                       -- chỉ dùng cho báo chí
  cluster_id uuid,                              -- chỉ dùng cho báo chí
  fetched_at timestamptz not null default now(),
  unique (source_type, external_id)
);
create index posts_published_at_idx on posts (published_at desc);

create table clusters (
  id uuid primary key default gen_random_uuid(),
  representative_post_id uuid references posts(id) on delete set null,
  topic text,
  n_sources int not null default 1,
  source_types text[] not null default '{}',
  first_seen timestamptz not null default now(),
  last_updated timestamptz not null default now(),
  heat_score double precision not null default 0,
  status text not null default 'open' check (status in ('open','archived'))
);
alter table posts add constraint posts_cluster_fk
  foreign key (cluster_id) references clusters(id) on delete set null;

create table cluster_summaries (
  cluster_id uuid primary key references clusters(id) on delete cascade,
  summary_vi text not null,
  bullets_vi jsonb not null default '[]',
  input_hash text not null,
  generated_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references clusters(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  user_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Áp migration vào DB local**

Run: `npx supabase db reset`
Expected: chạy lại migration, không lỗi; in `Applying migration 0001_init.sql...` rồi hoàn tất.

- [ ] **Step 3: Kiểm tra bảng đã tạo**

Run:
```bash
npx supabase db reset && \
psql "$(npx supabase status -o json | npx -y node-jq -r '.DB_URL' 2>/dev/null || echo postgresql://postgres:postgres@127.0.0.1:54322/postgres)" -c "\dt"
```
Expected: liệt kê 5 bảng `sources, posts, clusters, cluster_summaries, comments`.
(Nếu chưa có `psql`, có thể mở Supabase Studio ở URL `npx supabase status` in ra để xem bảng.)

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: schema khởi tạo (sources/posts/clusters/summaries/comments) + pgvector"
```

---

### Task 5: Ghi posts vào DB (upsert chống trùng)

**Files:**
- Create: `lib/db/client.ts`
- Create: `lib/db/posts.ts`
- Test: `lib/db/posts.test.ts`
- Create: `.env.local` (KHÔNG commit — đã có trong `.gitignore`)

**Interfaces:**
- Consumes: `NormalizedPost` (Task 1)
- Produces:
  - `function createServiceClient(): SupabaseClient` (đọc `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`)
  - `async function ensureSource(client, sourceType, name, config?): Promise<string>` (trả về `source_id`)
  - `async function upsertPosts(client, posts: NormalizedPost[]): Promise<number>` (trả về số dòng ghi mới)

- [ ] **Step 1: Tạo `.env.local` với key của local Supabase**

Dán URL + service_role key lấy từ `npx supabase status`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_KEY=<service_role key từ supabase status>
```

- [ ] **Step 2: Viết `lib/db/client.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
```

- [ ] **Step 3: Viết test fail (integration với DB local)**

Tạo `lib/db/posts.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createServiceClient } from './client';
import { upsertPosts } from './posts';
import type { NormalizedPost } from '../types';

const client = createServiceClient();

function makePost(externalId: string): NormalizedPost {
  return {
    sourceType: 'press',
    sourceName: 'Test Source',
    externalId,
    title: 'Tin thử nghiệm',
    text: 'noi dung',
    url: `https://example.com/${externalId}`,
    author: null,
    publishedAt: '2026-06-24T00:00:00.000Z',
    lang: null,
    metrics: {},
  };
}

describe('upsertPosts', () => {
  beforeAll(async () => {
    await client.from('posts').delete().eq('source_type', 'press');
    await client.from('sources').delete().eq('name', 'Test Source');
  });

  it('ghi post mới và trả về số dòng ghi', async () => {
    const n = await upsertPosts(client, [makePost('a1'), makePost('a2')]);
    expect(n).toBe(2);
    const { count } = await client
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', 'press');
    expect(count).toBe(2);
  });

  it('không tạo trùng khi external_id đã tồn tại', async () => {
    await upsertPosts(client, [makePost('a1'), makePost('a3')]);
    const { count } = await client
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', 'press');
    expect(count).toBe(3); // a1,a2,a3 — a1 không nhân đôi
  });
});
```

- [ ] **Step 4: Chạy test cho chắc nó FAIL**

Run: `npx supabase start && SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npm test lib/db/posts.test.ts`
(hoặc nạp `.env.local` qua `node --env-file=.env.local` — xem Task 6 Step 2)
Expected: FAIL — `Cannot find module './posts'`.

- [ ] **Step 5: Viết `lib/db/posts.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedPost, SourceType } from '../types';

export async function ensureSource(
  client: SupabaseClient,
  sourceType: SourceType,
  name: string,
  config: Record<string, unknown> = {},
): Promise<string> {
  const { data, error } = await client
    .from('sources')
    .upsert({ type: sourceType, name, config }, { onConflict: 'type,name' })
    .select('id')
    .single();
  if (error) throw new Error(`ensureSource lỗi: ${error.message}`);
  return data.id as string;
}

export async function upsertPosts(
  client: SupabaseClient,
  posts: NormalizedPost[],
): Promise<number> {
  if (posts.length === 0) return 0;

  // Resolve source_id cho từng (sourceType, sourceName) duy nhất
  const sourceIds = new Map<string, string>();
  for (const p of posts) {
    const key = `${p.sourceType}::${p.sourceName}`;
    if (!sourceIds.has(key)) {
      sourceIds.set(key, await ensureSource(client, p.sourceType, p.sourceName));
    }
  }

  const rows = posts.map((p) => ({
    source_id: sourceIds.get(`${p.sourceType}::${p.sourceName}`),
    source_type: p.sourceType,
    external_id: p.externalId,
    title: p.title,
    text: p.text,
    url: p.url,
    author: p.author,
    published_at: p.publishedAt,
    lang: p.lang,
    metrics: p.metrics,
  }));

  const { data, error } = await client
    .from('posts')
    .upsert(rows, { onConflict: 'source_type,external_id', ignoreDuplicates: true })
    .select('id');
  if (error) throw new Error(`upsertPosts lỗi: ${error.message}`);
  return data?.length ?? 0;
}
```

- [ ] **Step 6: Chạy test cho PASS**

Run: `node --env-file=.env.local node_modules/.bin/vitest run lib/db/posts.test.ts`
Expected: PASS — 2 test xanh.

- [ ] **Step 7: Commit**

```bash
git add lib/db/client.ts lib/db/posts.ts lib/db/posts.test.ts
git commit -m "feat: upsert posts vào Supabase, chống trùng theo (source_type, external_id)"
```

---

### Task 6: Seed nguồn báo chí + orchestrator ingest + script chạy

**Files:**
- Create: `lib/sources/seeds.ts`
- Create: `lib/sources/ingestPress.ts`
- Test: `lib/sources/ingestPress.test.ts`
- Create: `scripts/ingest-press.ts`

**Interfaces:**
- Consumes: `parsePressFeed`/`PressSource` (Task 2), `fetchFeed`/`FetchImpl` (Task 3), `upsertPosts` (Task 5)
- Produces:
  - `const PRESS_SOURCES: PressSource[]`
  - `interface IngestDeps { fetchImpl?: FetchImpl; upsert: (posts: NormalizedPost[]) => Promise<number> }`
  - `async function ingestPress(sources: PressSource[], deps: IngestDeps): Promise<{ fetched: number; inserted: number; failedSources: string[] }>`

- [ ] **Step 1: Viết `lib/sources/seeds.ts` (URL RSS từ spec §12.1)**

```ts
import type { PressSource } from './press';

export const PRESS_SOURCES: PressSource[] = [
  { name: 'The Verge', feedUrl: 'https://www.theverge.com/rss/index.xml' },
  { name: 'TechCrunch', feedUrl: 'https://techcrunch.com/feed/' },
  { name: 'Engadget', feedUrl: 'https://www.engadget.com/rss.xml' },
  { name: '9to5Mac', feedUrl: 'https://9to5mac.com/feed/' },
  { name: '9to5Google', feedUrl: 'https://9to5google.com/feed/' },
  { name: 'MacRumors', feedUrl: 'https://feeds.macrumors.com/MacRumors-All' },
  { name: 'Android Authority', feedUrl: 'https://www.androidauthority.com/feed/' },
  { name: 'Ars Technica', feedUrl: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Tom’s Hardware', feedUrl: 'https://www.tomshardware.com/feeds/all' },
  { name: 'Windows Central', feedUrl: 'https://www.windowscentral.com/rss' },
  { name: 'CNET', feedUrl: 'https://www.cnet.com/rss/news/' },
  { name: 'AndroidPolice', feedUrl: 'https://www.androidpolice.com/feed/' },
];
// Ghi chú: URL RSS có thể đổi — kiểm tra lại từng feed khi chạy thật.
```

- [ ] **Step 2: Viết test fail cho `ingestPress` (dùng fetch giả + upsert giả)**

Tạo `lib/sources/ingestPress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ingestPress } from './ingestPress';
import type { NormalizedPost } from '../types';

const xml = readFileSync(
  fileURLToPath(new URL('./__fixtures__/verge.xml', import.meta.url)),
  'utf-8',
);

describe('ingestPress', () => {
  it('fetch + parse + upsert cho mọi nguồn, trả về thống kê', async () => {
    const inserted: NormalizedPost[] = [];
    const result = await ingestPress(
      [{ name: 'The Verge', feedUrl: 'https://verge/feed' }],
      {
        fetchImpl: (async () => new Response(xml, { status: 200 })) as typeof fetch,
        upsert: async (posts) => {
          inserted.push(...posts);
          return posts.length;
        },
      },
    );
    expect(result.fetched).toBe(2);
    expect(result.inserted).toBe(2);
    expect(result.failedSources).toEqual([]);
    expect(inserted[0].sourceName).toBe('The Verge');
  });

  it('một nguồn lỗi thì bỏ qua, không làm hỏng toàn bộ (degrade)', async () => {
    const result = await ingestPress(
      [
        { name: 'Hỏng', feedUrl: 'https://bad/feed' },
        { name: 'The Verge', feedUrl: 'https://verge/feed' },
      ],
      {
        fetchImpl: (async (url: string) =>
          url.includes('bad')
            ? new Response('err', { status: 500 })
            : new Response(xml, { status: 200 })) as typeof fetch,
        upsert: async (posts) => posts.length,
      },
    );
    expect(result.failedSources).toEqual(['Hỏng']);
    expect(result.inserted).toBe(2);
  });
});
```

- [ ] **Step 3: Chạy test cho chắc nó FAIL**

Run: `npm test lib/sources/ingestPress.test.ts`
Expected: FAIL — `Cannot find module './ingestPress'`.

- [ ] **Step 4: Viết `lib/sources/ingestPress.ts`**

```ts
import { parsePressFeed, type PressSource } from './press';
import { fetchFeed, type FetchImpl } from './fetchFeed';
import type { NormalizedPost } from '../types';

export interface IngestDeps {
  fetchImpl?: FetchImpl;
  upsert: (posts: NormalizedPost[]) => Promise<number>;
}

export async function ingestPress(
  sources: PressSource[],
  deps: IngestDeps,
): Promise<{ fetched: number; inserted: number; failedSources: string[] }> {
  let fetched = 0;
  let inserted = 0;
  const failedSources: string[] = [];

  for (const source of sources) {
    try {
      const xml = await fetchFeed(source.feedUrl, deps.fetchImpl);
      const posts = await parsePressFeed(xml, source);
      fetched += posts.length;
      inserted += await deps.upsert(posts);
    } catch (err) {
      console.warn(`[ingestPress] bỏ qua nguồn "${source.name}":`, err);
      failedSources.push(source.name);
    }
  }

  return { fetched, inserted, failedSources };
}
```

- [ ] **Step 5: Chạy test cho PASS**

Run: `npm test lib/sources/ingestPress.test.ts`
Expected: PASS — 2 test xanh.

- [ ] **Step 6: Viết script chạy thật `scripts/ingest-press.ts`**

```ts
import { createServiceClient } from '../lib/db/client.js';
import { upsertPosts } from '../lib/db/posts.js';
import { ingestPress } from '../lib/sources/ingestPress.js';
import { PRESS_SOURCES } from '../lib/sources/seeds.js';

async function main() {
  const client = createServiceClient();
  const result = await ingestPress(PRESS_SOURCES, {
    upsert: (posts) => upsertPosts(client, posts),
  });
  console.log('Ingest báo chí xong:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Thêm script:
```bash
npm pkg set scripts.ingest:press="node --env-file=.env.local --import tsx scripts/ingest-press.ts"
```

- [ ] **Step 7: Chạy ingest thật và kiểm tra DB có dữ liệu**

Run: `npm run ingest:press`
Expected: in `Ingest báo chí xong: { fetched: N, inserted: M, failedSources: [...] }` với N > 0.
Kiểm tra: mở Supabase Studio (URL từ `npx supabase status`) → bảng `posts` có dòng thật từ các báo.

- [ ] **Step 8: Commit**

```bash
git add lib/sources/seeds.ts lib/sources/ingestPress.ts lib/sources/ingestPress.test.ts scripts/ingest-press.ts package.json
git commit -m "feat: orchestrator ingest báo chí + seed nguồn + script chạy thật"
```

---

## Định nghĩa hoàn thành Phase 1

- `npm test` xanh toàn bộ (types, press parse, fetchFeed, upsert, ingestPress).
- `npm run ingest:press` lấy được tin thật từ ít nhất vài nguồn báo và ghi vào `posts`, không tạo bản trùng khi chạy lại lần hai.
- Schema đầy đủ 5 bảng + `pgvector` sẵn sàng cho Phase 2 (gom cụm + xếp độ nóng).

## Bước tiếp theo (Phase 2 — sẽ viết kế hoạch riêng)

Gom cụm báo chí (embedding + cổng thực thể) + tính `heat_score` + API feed tối giản đọc từ `posts`/`clusters`.
