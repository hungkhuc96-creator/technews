# Phase 4: Tóm tắt AI tiếng Việt (GLM 5.2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sinh tóm tắt tiếng Việt (2–3 câu + bullet) ở cấp cụm bằng GLM 5.2, lưu cache, và hiển thị thay cho tiêu đề tiếng Anh trong mỗi card feed.

**Architecture:** Logic dựng prompt + parse kết quả là hàm thuần (test bằng `chat` giả). GLM gọi qua **client tương thích OpenAI** (`openai` SDK đổi `baseURL`+`model`) nên đổi nhà cung cấp chỉ là đổi env. Chỉ tóm tắt **cụm lên feed** (top theo độ nóng) + cache theo `input_hash` để khỏi gọi lại khi cụm không đổi.

**Tech Stack:** TypeScript, Vitest, `openai` SDK (trỏ tới endpoint GLM/Z.ai), Supabase, `node:crypto` (hash), Next.js (hiển thị).

## Global Constraints

- Ngôn ngữ **TypeScript**, Node ≥ 20; Next.js App Router.
- Tóm tắt **ở cấp cụm**, CHỈ cho cụm lên feed (top theo `heat_score`) — tiết kiệm chi phí.
- Đầu ra **tiếng Việt**: `summary` (2–3 câu) + `bullets` (2–3 ý).
- Cache theo `input_hash` (băm id các bài trong cụm) — chỉ gọi lại GLM khi cụm đổi.
- LLM gọi qua **API tương thích OpenAI**; cấu hình bằng env `GLM_API_KEY`, `GLM_BASE_URL` (mặc định `https://api.z.ai/api/paas/v4`), `GLM_MODEL` (mặc định `glm-5.2`).
- Bản quyền: chỉ tóm tắt + link nguồn; KHÔNG đăng toàn văn.
- TDD; mỗi task một commit.

---

### Task 1: Dựng prompt + parse kết quả (logic thuần)

**Files:**
- Create: `lib/summarize/summarizeCluster.ts`
- Test: `lib/summarize/summarizeCluster.test.ts`

**Interfaces:**
- Produces:
  - `interface ArticleInput { title: string; text: string; sourceName: string | null }`
  - `interface ClusterSummary { summary: string; bullets: string[] }`
  - `type ChatFn = (prompt: string) => Promise<string>`
  - `function buildPrompt(articles: ArticleInput[]): string`
  - `function parseSummary(raw: string): ClusterSummary`
  - `async function summarizeCluster(articles: ArticleInput[], chat: ChatFn): Promise<ClusterSummary>`

- [ ] **Step 1: Viết test fail**

Tạo `lib/summarize/summarizeCluster.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildPrompt, parseSummary, summarizeCluster, type ArticleInput } from './summarizeCluster';

const articles: ArticleInput[] = [
  { title: 'OpenAI launches GPT-5.2', text: 'New model tops benchmarks.', sourceName: 'The Verge' },
  { title: 'GPT-5.2 is here', text: 'Cheaper and faster.', sourceName: 'TechCrunch' },
];

describe('buildPrompt', () => {
  it('chứa tiêu đề các bài và yêu cầu tiếng Việt + JSON', () => {
    const p = buildPrompt(articles);
    expect(p).toContain('OpenAI launches GPT-5.2');
    expect(p).toContain('TIẾNG VIỆT');
    expect(p).toContain('summary');
    expect(p).toContain('bullets');
  });
});

describe('parseSummary', () => {
  it('parse JSON thường', () => {
    const r = parseSummary('{"summary":"Tóm tắt.","bullets":["A","B"]}');
    expect(r.summary).toBe('Tóm tắt.');
    expect(r.bullets).toEqual(['A', 'B']);
  });
  it('parse JSON bọc trong ```json fence', () => {
    const r = parseSummary('```json\n{"summary":"X","bullets":["Y"]}\n```');
    expect(r.summary).toBe('X');
    expect(r.bullets).toEqual(['Y']);
  });
  it('ném lỗi nếu thiếu summary', () => {
    expect(() => parseSummary('{"bullets":[]}')).toThrow();
  });
});

describe('summarizeCluster', () => {
  it('gọi chat với prompt, trả kết quả đã parse', async () => {
    let seen = '';
    const fakeChat = async (prompt: string) => {
      seen = prompt;
      return '{"summary":"GPT-5.2 ra mắt.","bullets":["Dẫn đầu benchmark","Rẻ hơn"]}';
    };
    const r = await summarizeCluster(articles, fakeChat);
    expect(seen).toContain('GPT-5.2');
    expect(r.summary).toBe('GPT-5.2 ra mắt.');
    expect(r.bullets).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó FAIL**

Run: `npm test lib/summarize/summarizeCluster.test.ts`
Expected: FAIL — không tìm thấy module `./summarizeCluster`.

- [ ] **Step 3: Viết `lib/summarize/summarizeCluster.ts`**

```ts
export interface ArticleInput {
  title: string;
  text: string;
  sourceName: string | null;
}

export interface ClusterSummary {
  summary: string;
  bullets: string[];
}

export type ChatFn = (prompt: string) => Promise<string>;

export function buildPrompt(articles: ArticleInput[]): string {
  const list = articles
    .map((a, i) => `${i + 1}. [${a.sourceName ?? 'Nguồn'}] ${a.title}\n${a.text}`)
    .join('\n\n');
  return [
    'Bạn là biên tập viên công nghệ. Dưới đây là các bài báo (tiếng Anh) về CÙNG một sự kiện:',
    '',
    list,
    '',
    'Hãy viết bằng TIẾNG VIỆT, khách quan, súc tích:',
    '- "summary": 2-3 câu tóm tắt sự kiện.',
    '- "bullets": 2-3 ý chính ngắn gọn.',
    'Chỉ trả về JSON đúng định dạng: {"summary": "...", "bullets": ["...", "..."]}',
  ].join('\n');
}

export function parseSummary(raw: string): ClusterSummary {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const obj = JSON.parse(s) as { summary?: unknown; bullets?: unknown };
  const summary = String(obj.summary ?? '').trim();
  const bullets = Array.isArray(obj.bullets)
    ? obj.bullets.map((b) => String(b).trim()).filter(Boolean)
    : [];
  if (!summary) throw new Error('parseSummary: thiếu summary');
  return { summary, bullets };
}

export async function summarizeCluster(
  articles: ArticleInput[],
  chat: ChatFn,
): Promise<ClusterSummary> {
  const raw = await chat(buildPrompt(articles));
  return parseSummary(raw);
}
```

- [ ] **Step 4: Chạy test cho PASS**

Run: `npm test lib/summarize/summarizeCluster.test.ts`
Expected: PASS — toàn bộ xanh.

- [ ] **Step 5: Commit**

```bash
git add lib/summarize/summarizeCluster.ts lib/summarize/summarizeCluster.test.ts
git commit -m "feat: dựng prompt + parse tóm tắt cụm (logic thuần, chat tiêm được)"
```

---

### Task 2: Client GLM + orchestrator `runSummarize` (DB)

**Files:**
- Create: `lib/summarize/glmClient.ts`
- Create: `lib/summarize/runSummarize.ts`
- Test: `lib/summarize/runSummarize.test.ts`

**Interfaces:**
- Consumes: `summarizeCluster`/`ChatFn`/`ArticleInput` (Task 1).
- Produces:
  - `function createChat(): ChatFn` (đọc env GLM_*)
  - `async function runSummarize(client: SupabaseClient, chat: ChatFn, opts?: { limit?: number }): Promise<{ summarized: number; skipped: number }>`

- [ ] **Step 1: Cài SDK OpenAI (dùng làm client tương thích cho GLM)**

```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && npm install openai
```

- [ ] **Step 2: Viết `lib/summarize/glmClient.ts`**

```ts
import OpenAI from 'openai';
import type { ChatFn } from './summarizeCluster';

export function createChat(): ChatFn {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) throw new Error('Thiếu GLM_API_KEY');
  const baseURL = process.env.GLM_BASE_URL ?? 'https://api.z.ai/api/paas/v4';
  const model = process.env.GLM_MODEL ?? 'glm-5.2';
  const client = new OpenAI({ apiKey, baseURL });
  return async (prompt: string) => {
    const res = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    return res.choices[0]?.message?.content ?? '';
  };
}
```

- [ ] **Step 3: Viết test fail cho `runSummarize` (integration, chat GIẢ → không tốn tiền)**

Tạo `lib/summarize/runSummarize.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { upsertPosts } from '../db/posts';
import { runSummarize } from './runSummarize';

const client = createServiceClient();
let clusterId: string;
const URL = 'https://example.com/sum-1';

const fakeChat = async () =>
  '{"summary":"Bản tóm tắt thử nghiệm.","bullets":["Ý một","Ý hai"]}';

describe('runSummarize', () => {
  beforeAll(async () => {
    await client.from('cluster_summaries').delete().eq('input_hash', '__never__'); // no-op an toàn
    await client.from('posts').delete().like('url', 'https://example.com/sum-%');
    await client.from('sources').delete().eq('name', 'Sum-Src');
    await client.from('clusters').delete().eq('topic', '__sum_test__');

    const { data: cl } = await client
      .from('clusters')
      .insert({ topic: '__sum_test__', n_sources: 1, post_count: 1, heat_score: 999, status: 'open' })
      .select('id')
      .single();
    clusterId = cl!.id;
    await upsertPosts(client, [{
      sourceType: 'press', sourceName: 'Sum-Src', externalId: 'sum1',
      title: 'A big tech event', text: 'details', url: URL,
      author: null, publishedAt: '2026-06-25T00:00:00.000Z', lang: null, metrics: {},
    }]);
    await client.from('posts').update({ cluster_id: clusterId }).eq('url', URL);
  });

  afterAll(async () => {
    await client.from('cluster_summaries').delete().eq('cluster_id', clusterId);
    await client.from('clusters').delete().eq('id', clusterId);
    await client.from('posts').delete().like('url', 'https://example.com/sum-%');
    await client.from('sources').delete().eq('name', 'Sum-Src');
  });

  it('tóm tắt cụm lên feed và lưu cluster_summaries', async () => {
    const r = await runSummarize(client, fakeChat, { limit: 1 });
    expect(r.summarized).toBeGreaterThanOrEqual(1);
    const { data } = await client
      .from('cluster_summaries').select('summary_vi, bullets_vi').eq('cluster_id', clusterId).single();
    expect(data!.summary_vi).toBe('Bản tóm tắt thử nghiệm.');
    expect(data!.bullets_vi).toEqual(['Ý một', 'Ý hai']);
  }, 60000);

  it('chạy lại không gọi AI nữa nếu cụm không đổi (cache theo input_hash)', async () => {
    const r = await runSummarize(client, fakeChat, { limit: 1 });
    // cụm test không đổi → phải nằm trong nhóm "skipped"
    expect(r.skipped).toBeGreaterThanOrEqual(1);
  }, 60000);
});
```

- [ ] **Step 4: Chạy test cho chắc nó FAIL**

Run: `npm test lib/summarize/runSummarize.test.ts`
Expected: FAIL — không tìm thấy module `./runSummarize`.

- [ ] **Step 5: Viết `lib/summarize/runSummarize.ts`**

```ts
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { summarizeCluster, type ChatFn, type ArticleInput } from './summarizeCluster';

function sourceName(p: { sources?: unknown }): string | null {
  const s = (p as { sources?: { name?: string } | { name?: string }[] }).sources;
  if (Array.isArray(s)) return s[0]?.name ?? null;
  return s?.name ?? null;
}

export async function runSummarize(
  client: SupabaseClient,
  chat: ChatFn,
  opts: { limit?: number } = {},
): Promise<{ summarized: number; skipped: number }> {
  const limit = opts.limit ?? 40;
  const { data: clusters, error } = await client
    .from('clusters')
    .select('id')
    .eq('status', 'open')
    .order('heat_score', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`runSummarize đọc clusters lỗi: ${error.message}`);

  let summarized = 0;
  let skipped = 0;

  for (const cl of clusters ?? []) {
    const { data: posts } = await client
      .from('posts')
      .select('id, title, text, sources(name)')
      .eq('cluster_id', cl.id)
      .order('published_at', { ascending: false });
    if (!posts || posts.length === 0) continue;

    const inputHash = createHash('sha1')
      .update(posts.map((p) => p.id).sort().join(','))
      .digest('hex');

    const { data: existing } = await client
      .from('cluster_summaries').select('input_hash').eq('cluster_id', cl.id).maybeSingle();
    if (existing?.input_hash === inputHash) {
      skipped++;
      continue;
    }

    const articles: ArticleInput[] = posts.slice(0, 8).map((p) => ({
      title: p.title,
      text: (p.text ?? '').slice(0, 500),
      sourceName: sourceName(p),
    }));
    const s = await summarizeCluster(articles, chat);

    await client.from('cluster_summaries').upsert(
      {
        cluster_id: cl.id,
        summary_vi: s.summary,
        bullets_vi: s.bullets,
        input_hash: inputHash,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'cluster_id' },
    );
    summarized++;
  }

  return { summarized, skipped };
}
```

- [ ] **Step 6: Chạy test cho PASS**

Run: `npm test lib/summarize/runSummarize.test.ts`
Expected: PASS — 2 test xanh (tóm tắt + cache bỏ qua).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/summarize/glmClient.ts lib/summarize/runSummarize.ts lib/summarize/runSummarize.test.ts
git commit -m "feat: client GLM (OpenAI-compatible) + runSummarize cache theo input_hash"
```

---

### Task 3: Hiển thị tóm tắt trong feed (getFeed + FeedCard)

**Files:**
- Modify: `lib/feed/getFeed.ts`
- Modify: `lib/feed/getFeed.test.ts`
- Modify: `components/FeedCard.tsx`
- Modify: `components/FeedCard.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces (mở rộng `FeedItem`): thêm `summary: string | null; bullets: string[]`.

- [ ] **Step 1: Cập nhật test `getFeed` — thêm kiểm tra summary**

Trong `lib/feed/getFeed.test.ts`, ở `beforeAll` (sau khi tạo cụm `hotId`), thêm một
bản tóm tắt cho cụm `hotId`:

```ts
    await client.from('cluster_summaries').upsert({
      cluster_id: hotId,
      summary_vi: 'Tóm tắt nóng.',
      bullets_vi: ['Điểm 1', 'Điểm 2'],
      input_hash: 'h',
      generated_at: new Date().toISOString(),
    }, { onConflict: 'cluster_id' });
```
Và trong `afterAll` thêm dọn dẹp:
```ts
    await client.from('cluster_summaries').delete().in('cluster_id', [hotId, coldId]);
```
Và thêm kiểm tra trong test chính:
```ts
    expect(items[idx].summary).toBe('Tóm tắt nóng.');
    expect(items[idx].bullets).toEqual(['Điểm 1', 'Điểm 2']);
```

- [ ] **Step 2: Chạy test cho chắc nó FAIL**

Run: `npm test lib/feed/getFeed.test.ts`
Expected: FAIL — `items[idx].summary` là `undefined` (getFeed chưa trả summary).

- [ ] **Step 3: Cập nhật `lib/feed/getFeed.ts`**

Thêm field vào `FeedItem`:
```ts
export interface FeedItem {
  clusterId: string;
  title: string;
  url: string;
  sourceName: string | null;
  publishedAt: string;
  nSources: number;
  sourceTypes: string[];
  heat: number;
  summary: string | null;
  bullets: string[];
}
```

Sau khi lấy `clusters` và `posts`, lấy thêm tóm tắt rồi gắn vào. Thay phần `return`
bằng:
```ts
  const clusterIds = (clusters ?? []).map((c) => c.id);
  const { data: summaries } = clusterIds.length
    ? await client
        .from('cluster_summaries')
        .select('cluster_id, summary_vi, bullets_vi')
        .in('cluster_id', clusterIds)
    : { data: [] as any[] };
  const sumById = new Map((summaries ?? []).map((s: any) => [s.cluster_id, s]));

  return (clusters ?? [])
    .map((c) => {
      const p = postById.get(c.representative_post_id);
      if (!p) return null;
      const sourceName = Array.isArray(p.sources)
        ? (p.sources[0]?.name ?? null)
        : (p.sources?.name ?? null);
      const sum = sumById.get(c.id);
      return {
        clusterId: c.id,
        title: p.title,
        url: p.url,
        sourceName,
        publishedAt: p.published_at,
        nSources: c.n_sources,
        sourceTypes: c.source_types ?? [],
        heat: c.heat_score,
        summary: sum?.summary_vi ?? null,
        bullets: Array.isArray(sum?.bullets_vi) ? sum.bullets_vi : [],
      } satisfies FeedItem;
    })
    .filter((x): x is FeedItem => x !== null);
```

- [ ] **Step 4: Chạy test `getFeed` cho PASS**

Run: `npm test lib/feed/getFeed.test.ts`
Expected: PASS.

- [ ] **Step 5: Cập nhật test `FeedCard` — kiểm tra bullets hiển thị**

Trong `components/FeedCard.test.tsx`, sửa object `item` thêm:
```ts
  summary: 'Tóm tắt tiếng Việt.',
  bullets: ['Ý chính một', 'Ý chính hai'],
```
Và thêm test:
```ts
  it('hiển thị các bullet tóm tắt tiếng Việt', () => {
    render(<FeedCard item={item} now={new Date('2026-06-24T12:00:00.000Z')} />);
    expect(screen.getByText('Ý chính một')).toBeDefined();
    expect(screen.getByText('Ý chính hai')).toBeDefined();
  });
```

- [ ] **Step 6: Chạy test cho chắc nó FAIL**

Run: `npm test components/FeedCard.test.tsx`
Expected: FAIL — chưa render bullets.

- [ ] **Step 7: Cập nhật `components/FeedCard.tsx`**

Thêm phần bullets sau `<h3 className="card-title">…</h3>`:
```tsx
      {item.bullets.length > 0 && (
        <ul className="card-bullets">
          {item.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
```
(Đặt ngay trước `<div className="card-foot">`.)

- [ ] **Step 8: Thêm style vào `app/globals.css`**

```css
.card-bullets { margin: 6px 0 10px; padding-left: 18px; color: var(--text-dim); font-size: 14px; line-height: 1.5; }
.card-bullets li { margin: 2px 0; }
```

- [ ] **Step 9: Chạy test cho PASS + toàn bộ**

Run: `npm test`
Expected: tất cả xanh (getFeed + FeedCard mới).

- [ ] **Step 10: Commit**

```bash
git add lib/feed/getFeed.ts lib/feed/getFeed.test.ts components/FeedCard.tsx components/FeedCard.test.tsx app/globals.css
git commit -m "feat: hiển thị tóm tắt tiếng Việt (bullet) trong card feed"
```

---

### Task 4: Lấy key GLM + chạy thật + xem trên web

**Files:**
- Create: `scripts/summarize.ts`
- Modify: `package.json` (script `summarize`)
- Modify: `.env.local` (KHÔNG commit)

**Interfaces:**
- Consumes: `createChat` (Task 2), `runSummarize` (Task 2).

- [ ] **Step 1: Viết script `scripts/summarize.ts`**

```ts
import { createServiceClient } from '../lib/db/client.js';
import { createChat } from '../lib/summarize/glmClient.js';
import { runSummarize } from '../lib/summarize/runSummarize.js';

async function main() {
  const r = await runSummarize(createServiceClient(), createChat(), { limit: 40 });
  console.log('Tóm tắt xong:', r);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Thêm script:
```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && npm pkg set scripts.summarize="node --env-file=.env.local --import tsx scripts/summarize.ts"
```

- [ ] **Step 2: Lấy GLM API key (người dùng làm)**

1. Vào **https://z.ai** (hoặc bigmodel.cn) → đăng ký → mục **API Keys** → tạo key.
2. Thêm vào `.env.local`:
```
GLM_API_KEY=<key của bạn>
GLM_BASE_URL=https://api.z.ai/api/paas/v4
GLM_MODEL=glm-5.2
```
(Nếu nhà cung cấp dùng id model khác, sửa `GLM_MODEL` cho khớp — vd `zai-org/GLM-5.2` trên một số cổng.)

- [ ] **Step 3: Chạy tóm tắt thật trên các cụm top**

Run: `npm run summarize`
Expected: in `Tóm tắt xong: { summarized: N, skipped: M }` với N > 0. (Mỗi cụm 1
lượt gọi GLM; ~40 cụm nên mất chút thời gian.)

Kiểm tra DB có bản tóm tắt tiếng Việt:
```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && node --env-file=.env.local --input-type=module -e "
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { data } = await c.from('cluster_summaries').select('summary_vi,bullets_vi').limit(3);
for (const s of data) { console.log('•', s.summary_vi); for (const b of s.bullets_vi) console.log('   -', b); }
"
```
Expected: in ra vài tóm tắt + bullet TIẾNG VIỆT.

- [ ] **Step 4: Xem trên web**

Run: `npm run dev` → mở `http://localhost:3000`.
Expected: mỗi card cụm (đã tóm tắt) hiện **2–3 bullet tiếng Việt** dưới tiêu đề.

- [ ] **Step 5: Commit**

```bash
git add scripts/summarize.ts package.json
git commit -m "feat: script summarize + chạy thật tóm tắt tiếng Việt qua GLM 5.2"
```

---

## Định nghĩa hoàn thành Phase 4

- `npm test` xanh toàn bộ (gồm summarizeCluster, runSummarize, getFeed/FeedCard có bullets).
- `npm run summarize` sinh tóm tắt tiếng Việt cho các cụm top, cache đúng (chạy lại đa số `skipped`).
- Web hiển thị 2–3 bullet tiếng Việt trong mỗi card đã tóm tắt.

## Bước tiếp theo (Phase 5 — kế hoạch riêng)

Thêm adapter YouTube + Reddit + X (Apify) + TikTok (Apify); chuẩn hóa về `NormalizedPost`, hiện thành card riêng theo loại nguồn.
