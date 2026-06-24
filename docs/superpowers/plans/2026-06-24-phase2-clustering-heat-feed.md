# Phase 2: Gom cụm báo chí + Xếp độ nóng + API feed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến các tin báo chí đã có trong DB thành các **cụm sự kiện** (gom tin trùng, đếm số nguồn), tính **độ nóng** cho mỗi cụm, và mở một **API feed** trả về các cụm xếp theo độ nóng.

**Architecture:** Embedding chạy bằng model local (Transformers.js). Embedding lưu dạng `jsonb`; độ tương đồng cosine tính bằng JavaScript (chưa cần pgvector). Logic thuần (cosine, trích thực thể, quyết định cụm, công thức nóng) tách khỏi I/O để test nhanh; bộ điều phối gom cụm/chấm điểm nhận `embed` qua tham số để test tiêm hàm giả. Gom cụm CHỈ áp dụng cho báo chí.

**Tech Stack:** TypeScript, Vitest, `@xenova/transformers` (embedding local `Xenova/multilingual-e5-small`, 384 chiều), Supabase (`@supabase/supabase-js`), Next.js App Router (route handler cho API feed), `tsx` (script).

## Global Constraints

- Ngôn ngữ **TypeScript**, Node ≥ 20; framework **Next.js App Router**.
- **Gom cụm CHỈ cho `source_type='press'`.** YouTube/Reddit/X/TikTok không xử lý ở Phase 2.
- **Embedding: local** `Xenova/multilingual-e5-small` (384 chiều), **không cần API key**.
- **Lưu embedding & centroid dạng `jsonb`** (mảng số); **cosine tính ở JS** (pgvector hoãn).
- **Gom cụm:** ngưỡng cosine **0.82**; **cổng thực thể** (cụm và post phải chung ≥1 thực thể); **cửa sổ 48 giờ** (chỉ xét cụm `status='open'` có `last_updated` trong 48h).
- **Độ nóng báo chí:** `heat = n_sources / (age_hours + 2) ^ 1.5`.
- `n_sources` = số **source_id phân biệt** trong cụm (không phải số post).
- TDD: test fail trước → code tối thiểu → commit. Mỗi task một commit.

---

### Task 1: Migration 0002 — chuyển embedding sang jsonb + thêm cột cho cụm

**Files:**
- Create: `supabase/migrations/0002_clustering.sql`

**Interfaces:**
- Produces (cột mới để các task sau dùng):
  - `posts.embedding jsonb` (thay cho `vector(1536)` cũ — đang rỗng nên đổi an toàn)
  - `clusters.centroid jsonb` (vector trung tâm của cụm)
  - `clusters.entities text[]` (các thực thể của cụm, để lọc ứng viên)
  - `clusters.post_count int` (số post trong cụm, để cập nhật centroid)

- [ ] **Step 1: Viết migration**

Tạo `supabase/migrations/0002_clustering.sql`:

```sql
-- Đổi cách lưu embedding sang jsonb (tính cosine ở JS, chưa cần pgvector).
-- Cột cũ vector(1536) đang rỗng nên xóa và tạo lại an toàn.
alter table posts drop column if exists embedding;
alter table posts add column embedding jsonb;

-- Thêm dữ liệu phục vụ gom cụm vào bảng clusters.
alter table clusters add column if not exists centroid jsonb;
alter table clusters add column if not exists entities text[] not null default '{}';
alter table clusters add column if not exists post_count int not null default 0;
```

- [ ] **Step 2: Áp migration lên Supabase (đám mây)**

Mở project Supabase → **SQL Editor** → **New query** → dán toàn bộ nội dung file
trên → **Run** (lần này có thể bấm **Run** thường, không cần RLS vì chỉ sửa cột).
Kỳ vọng: "Success".

- [ ] **Step 3: Kiểm tra cột mới tồn tại**

Chạy:
```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && node --env-file=.env.local --input-type=module -e "
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { error } = await c.from('clusters').select('centroid,entities,post_count').limit(1);
console.log(error ? 'THIẾU CỘT: '+error.message : 'OK: cột cụm đã có');
const { error: e2 } = await c.from('posts').select('embedding').limit(1);
console.log(e2 ? 'THIẾU: '+e2.message : 'OK: posts.embedding (jsonb) đã có');
"
```
Kỳ vọng: hai dòng "OK".

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_clustering.sql
git commit -m "feat: migration 0002 — embedding jsonb + cột centroid/entities/post_count cho cụm"
```

---

### Task 2: Embedding local (`embedText`)

**Files:**
- Create: `lib/enrich/embed.ts`
- Test: `lib/enrich/embed.test.ts`

**Interfaces:**
- Produces: `async function embedText(text: string): Promise<number[]>` — trả vector 384 số đã chuẩn hóa (độ dài 1).

- [ ] **Step 1: Cài thư viện embedding**

```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && npm install @xenova/transformers
```

- [ ] **Step 2: Viết test fail**

Tạo `lib/enrich/embed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { embedText } from './embed';

describe('embedText', () => {
  it('trả vector 384 chiều, đã chuẩn hóa (norm ≈ 1)', async () => {
    const v = await embedText('OpenAI launches GPT-5.2');
    expect(v).toHaveLength(384);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 1);
  }, 180000); // lần đầu phải tải model (~100MB) nên cho thời gian rộng
});
```

- [ ] **Step 3: Chạy test cho chắc nó FAIL**

Run: `npm test lib/enrich/embed.test.ts`
Expected: FAIL — `Cannot find module './embed'`.

- [ ] **Step 4: Viết `lib/enrich/embed.ts`**

```ts
import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
  }
  return extractorPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  // e5 khuyến nghị tiền tố "passage: " cho văn bản tài liệu.
  const output = await extractor(`passage: ${text}`, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}
```

- [ ] **Step 5: Chạy test cho PASS**

Run: `npm test lib/enrich/embed.test.ts`
Expected: PASS (lần đầu chậm do tải model; các lần sau nhanh).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/enrich/embed.ts lib/enrich/embed.test.ts
git commit -m "feat: embedding local bằng Transformers.js (multilingual-e5-small, 384d)"
```

---

### Task 3: Logic gom cụm thuần (cosine + thực thể + quyết định cụm)

**Files:**
- Create: `lib/cluster/similarity.ts`
- Create: `lib/enrich/entities.ts`
- Create: `lib/cluster/decide.ts`
- Test: `lib/cluster/decide.test.ts`

**Interfaces:**
- Produces:
  - `function cosineSimilarity(a: number[], b: number[]): number`
  - `function extractEntities(title: string): string[]` (chữ thường, đã khử trùng)
  - `interface ClusterCandidate { id: string; centroid: number[]; entities: string[] }`
  - `function bestCluster(embedding: number[], entities: string[], candidates: ClusterCandidate[], threshold?: number): { clusterId: string; score: number } | null` (mặc định `threshold = 0.82`)

- [ ] **Step 1: Viết test fail**

Tạo `lib/cluster/decide.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './similarity';
import { extractEntities } from '../enrich/entities';
import { bestCluster, type ClusterCandidate } from './decide';

describe('cosineSimilarity', () => {
  it('vector giống hệt = 1, vuông góc = 0', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe('extractEntities', () => {
  it('lấy tên riêng/sản phẩm, bỏ chữ thường thường', () => {
    const e = extractEntities('OpenAI ra mắt GPT-5.2');
    expect(e).toContain('openai');
    expect(e).toContain('gpt-5.2');
    expect(e).not.toContain('ra');
  });
  it('bỏ số trần và từ phổ biến viết hoa đầu câu', () => {
    const e = extractEntities('Apple chốt sự kiện iPhone 17');
    expect(e).toContain('apple');
    expect(e).toContain('iphone');
    expect(e).not.toContain('17');
  });
});

describe('bestCluster', () => {
  const candidates: ClusterCandidate[] = [
    { id: 'c-gpt', centroid: [1, 0, 0], entities: ['gpt-5.2', 'openai'] },
    { id: 'c-iphone', centroid: [0, 1, 0], entities: ['iphone', 'apple'] },
  ];

  it('nhập cụm khi đủ giống + trùng thực thể', () => {
    const r = bestCluster([0.98, 0.05, 0], ['gpt-5.2'], candidates);
    expect(r?.clusterId).toBe('c-gpt');
  });

  it('không nhập nếu không trùng thực thể (dù vector giống)', () => {
    const r = bestCluster([1, 0, 0], ['samsung'], candidates);
    expect(r).toBeNull();
  });

  it('không nhập nếu cosine dưới ngưỡng', () => {
    const r = bestCluster([0.3, 0.3, 0.9], ['gpt-5.2'], candidates);
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó FAIL**

Run: `npm test lib/cluster/decide.test.ts`
Expected: FAIL — không tìm thấy module `./similarity`.

- [ ] **Step 3: Viết `lib/cluster/similarity.ts`**

```ts
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
```

- [ ] **Step 4: Viết `lib/enrich/entities.ts`**

```ts
const STOPWORDS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'new', 'best', 'how', 'why',
  'what', 'when', 'where', 'your', 'our', 'my', 'we', 'it', 'is', 'are', 'to', 'of',
  'for', 'and', 'or', 'with', 'will', 'can', 'now', 'first', 'top', 'here',
]);

// Lấy "thực thể": token có chữ HOA hoặc có CHỮ SỐ (tên riêng/sản phẩm như
// OpenAI, GPT-5.2, iPhone, RTX). Bỏ số trần ("17") và từ thường viết hoa đầu câu.
export function extractEntities(title: string): string[] {
  const tokens = title.match(/[A-Za-z0-9][A-Za-z0-9.+-]*/g) ?? [];
  const out = new Set<string>();
  for (const t of tokens) {
    const hasLetter = /[A-Za-z]/.test(t);
    const hasUpper = /[A-Z]/.test(t);
    const hasDigit = /\d/.test(t);
    if (!hasLetter) continue;            // bỏ số trần
    if (!hasUpper && !hasDigit) continue; // bỏ từ thường
    const norm = t.toLowerCase();
    if (norm.length < 2) continue;
    if (STOPWORDS.has(norm)) continue;
    out.add(norm);
  }
  return [...out];
}
```

- [ ] **Step 5: Viết `lib/cluster/decide.ts`**

```ts
import { cosineSimilarity } from './similarity';

export interface ClusterCandidate {
  id: string;
  centroid: number[];
  entities: string[];
}

export function bestCluster(
  embedding: number[],
  entities: string[],
  candidates: ClusterCandidate[],
  threshold = 0.82,
): { clusterId: string; score: number } | null {
  const entitySet = new Set(entities);
  let best: { clusterId: string; score: number } | null = null;
  for (const c of candidates) {
    const overlap = c.entities.some((e) => entitySet.has(e));
    if (!overlap) continue;
    const score = cosineSimilarity(embedding, c.centroid);
    if (score >= threshold && (!best || score > best.score)) {
      best = { clusterId: c.id, score };
    }
  }
  return best;
}
```

- [ ] **Step 6: Chạy test cho PASS**

Run: `npm test lib/cluster/decide.test.ts`
Expected: PASS — toàn bộ test xanh.

- [ ] **Step 7: Commit**

```bash
git add lib/cluster/similarity.ts lib/enrich/entities.ts lib/cluster/decide.ts lib/cluster/decide.test.ts
git commit -m "feat: logic gom cụm thuần — cosine, trích thực thể, quyết định nhập cụm"
```

---

### Task 4: Bộ điều phối gom cụm (`runClustering`) — ghi DB

**Files:**
- Create: `lib/cluster/runClustering.ts`
- Test: `lib/cluster/runClustering.test.ts`

**Interfaces:**
- Consumes: `upsertPosts` (Phase 1, `lib/db/posts.ts`), `extractEntities` (Task 3), `bestCluster` (Task 3).
- Produces:
  - `interface ClusterDeps { embed: (text: string) => Promise<number[]>; now?: () => Date }`
  - `async function runClustering(client: SupabaseClient, deps: ClusterDeps): Promise<{ processed: number; created: number; updated: number }>`

- [ ] **Step 1: Viết test fail (integration, tiêm embed giả → nhanh, xác định)**

Tạo `lib/cluster/runClustering.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { upsertPosts } from '../db/posts';
import { runClustering } from './runClustering';
import type { NormalizedPost } from '../types';

const client = createServiceClient();

// Embed giả: 3 chiều, gần như vuông góc theo chủ đề → xác định.
const VEC: Record<string, number[]> = {
  gpt: [1, 0, 0],
  iphone: [0, 1, 0],
};
const fakeEmbed = async (text: string): Promise<number[]> => {
  if (text.toLowerCase().includes('gpt')) return VEC.gpt;
  if (text.toLowerCase().includes('iphone')) return VEC.iphone;
  return [0, 0, 1];
};

function post(source: string, externalId: string, title: string): NormalizedPost {
  return {
    sourceType: 'press', sourceName: source, externalId,
    title, text: title, url: `https://example.com/${externalId}`,
    author: null, publishedAt: '2026-06-24T00:00:00.000Z', lang: null, metrics: {},
  };
}

describe('runClustering', () => {
  beforeAll(async () => {
    // dọn dữ liệu test cũ (kể cả cụm mà lần chạy trước đã tạo)
    const { data: old } = await client
      .from('posts').select('cluster_id').like('url', 'https://example.com/%');
    const oldClusterIds = [...new Set((old ?? []).map((p) => p.cluster_id).filter(Boolean))];
    await client.from('posts').delete().like('url', 'https://example.com/%');
    if (oldClusterIds.length) await client.from('clusters').delete().in('id', oldClusterIds);
    await client.from('sources').delete().like('name', 'T-%');
    // nạp 3 post: 2 tin GPT từ 2 nguồn khác nhau, 1 tin iPhone
    await upsertPosts(client, [
      post('T-A', 'g1', 'OpenAI releases GPT-5.2'),
      post('T-B', 'g2', 'GPT-5.2 tops coding benchmark'),
      post('T-A', 'p1', 'Apple sets iPhone 17 event'),
    ]);
  });

  it('gom 2 tin GPT thành 1 cụm (2 nguồn), iPhone thành cụm riêng', async () => {
    const res = await runClustering(client, { embed: fakeEmbed });
    expect(res.processed).toBe(3);

    // lấy các cụm vừa tạo (qua post test)
    const { data: posts } = await client
      .from('posts')
      .select('external_id, cluster_id')
      .like('url', 'https://example.com/%');
    const byId = Object.fromEntries(posts!.map((p) => [p.external_id, p.cluster_id]));

    expect(byId.g1).toBe(byId.g2);     // 2 tin GPT cùng cụm
    expect(byId.p1).not.toBe(byId.g1); // iPhone khác cụm

    const { data: gptCluster } = await client
      .from('clusters').select('n_sources, post_count').eq('id', byId.g1).single();
    expect(gptCluster!.n_sources).toBe(2);  // 2 nguồn (T-A, T-B)
    expect(gptCluster!.post_count).toBe(2);
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó FAIL**

Run: `npm test lib/cluster/runClustering.test.ts`
Expected: FAIL — không tìm thấy module `./runClustering`.

- [ ] **Step 3: Viết `lib/cluster/runClustering.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractEntities } from '../enrich/entities';
import { bestCluster, type ClusterCandidate } from './decide';

export interface ClusterDeps {
  embed: (text: string) => Promise<number[]>;
  now?: () => Date;
}

const WINDOW_MS = 48 * 60 * 60 * 1000;

export async function runClustering(
  client: SupabaseClient,
  deps: ClusterDeps,
): Promise<{ processed: number; created: number; updated: number }> {
  const now = deps.now ? deps.now() : new Date();
  let processed = 0;
  let created = 0;
  let updated = 0;

  // Lấy các post báo chí chưa gán cụm, cũ trước (để cụm hình thành theo thời gian).
  const { data: posts, error } = await client
    .from('posts')
    .select('id, source_id, source_type, title, text, published_at, embedding, entities')
    .eq('source_type', 'press')
    .is('cluster_id', null)
    .order('published_at', { ascending: true });
  if (error) throw new Error(`runClustering đọc posts lỗi: ${error.message}`);

  for (const p of posts ?? []) {
    processed++;

    // 1) Embedding + thực thể (tính nếu chưa có, rồi lưu lại vào post)
    const embedding: number[] =
      Array.isArray(p.embedding) && p.embedding.length > 0
        ? (p.embedding as number[])
        : await deps.embed(`${p.title}. ${p.text ?? ''}`);
    const entities: string[] =
      Array.isArray(p.entities) && p.entities.length > 0
        ? (p.entities as string[])
        : extractEntities(p.title);
    await client.from('posts').update({ embedding, entities }).eq('id', p.id);

    // 2) Ứng viên: cụm đang mở, cập nhật trong 48h
    const since = new Date(now.getTime() - WINDOW_MS).toISOString();
    const { data: openClusters } = await client
      .from('clusters')
      .select('id, centroid, entities, post_count')
      .eq('status', 'open')
      .gte('last_updated', since);

    const candidates: ClusterCandidate[] = (openClusters ?? [])
      .filter((c) => Array.isArray(c.centroid))
      .map((c) => ({ id: c.id, centroid: c.centroid as number[], entities: c.entities ?? [] }));

    const match = bestCluster(embedding, entities, candidates);

    if (match) {
      // 3a) Nhập cụm: cập nhật centroid (trung bình động), post_count, thực thể, nguồn
      const cluster = (openClusters ?? []).find((c) => c.id === match.clusterId)!;
      const oldCentroid = cluster.centroid as number[];
      const oldCount = cluster.post_count as number;
      const newCentroid = oldCentroid.map(
        (x, i) => (x * oldCount + embedding[i]) / (oldCount + 1),
      );
      const mergedEntities = [...new Set([...(cluster.entities ?? []), ...entities])];

      await client.from('posts').update({ cluster_id: match.clusterId }).eq('id', p.id);

      const { sources, sourceTypes } = await sourceStats(client, match.clusterId);
      await client
        .from('clusters')
        .update({
          centroid: newCentroid,
          post_count: oldCount + 1,
          entities: mergedEntities,
          n_sources: sources,
          source_types: sourceTypes,
          last_updated: now.toISOString(),
        })
        .eq('id', match.clusterId);
      updated++;
    } else {
      // 3b) Tạo cụm mới
      const { data: newCluster, error: insErr } = await client
        .from('clusters')
        .insert({
          representative_post_id: p.id,
          centroid: embedding,
          entities,
          post_count: 1,
          n_sources: 1,
          source_types: [p.source_type],
          first_seen: p.published_at,
          last_updated: now.toISOString(),
          status: 'open',
        })
        .select('id')
        .single();
      if (insErr) throw new Error(`runClustering tạo cụm lỗi: ${insErr.message}`);
      await client.from('posts').update({ cluster_id: newCluster.id }).eq('id', p.id);
      created++;
    }
  }

  return { processed, created, updated };
}

// Đếm số nguồn phân biệt + danh sách loại nguồn của một cụm.
async function sourceStats(
  client: SupabaseClient,
  clusterId: string,
): Promise<{ sources: number; sourceTypes: string[] }> {
  const { data } = await client
    .from('posts')
    .select('source_id, source_type')
    .eq('cluster_id', clusterId);
  const sources = new Set((data ?? []).map((r) => r.source_id)).size;
  const sourceTypes = [...new Set((data ?? []).map((r) => r.source_type))];
  return { sources, sourceTypes };
}
```

- [ ] **Step 4: Chạy test cho PASS**

Run: `npm test lib/cluster/runClustering.test.ts`
Expected: PASS — 2 tin GPT cùng cụm (n_sources=2), iPhone cụm riêng.

- [ ] **Step 5: Dọn dữ liệu test khỏi DB**

Run:
```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && node --env-file=.env.local --input-type=module -e "
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { data: ps } = await c.from('posts').select('cluster_id').like('url','https://example.com/%');
const ids = [...new Set((ps??[]).map(p=>p.cluster_id).filter(Boolean))];
await c.from('posts').delete().like('url','https://example.com/%');
if (ids.length) await c.from('clusters').delete().in('id', ids);
await c.from('sources').delete().like('name','T-%');
console.log('Đã dọn dữ liệu test.');
"
```

- [ ] **Step 6: Commit**

```bash
git add lib/cluster/runClustering.ts lib/cluster/runClustering.test.ts
git commit -m "feat: bộ điều phối gom cụm báo chí (embedding + cổng thực thể + 48h)"
```

---

### Task 5: Xếp độ nóng (`pressHeat` + `runScoring`)

**Files:**
- Create: `lib/score/heat.ts`
- Create: `lib/score/runScoring.ts`
- Test: `lib/score/heat.test.ts`
- Test: `lib/score/runScoring.test.ts`

**Interfaces:**
- Produces:
  - `function pressHeat(nSources: number, ageHours: number): number`
  - `async function runScoring(client: SupabaseClient, now?: () => Date): Promise<{ scored: number }>`

- [ ] **Step 1: Viết test fail cho công thức**

Tạo `lib/score/heat.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pressHeat } from './heat';

describe('pressHeat', () => {
  it('= n_sources / (age + 2)^1.5', () => {
    // age = 0: 5 / 2^1.5 = 5 / 2.8284 ≈ 1.7678
    expect(pressHeat(5, 0)).toBeCloseTo(5 / Math.pow(2, 1.5), 4);
  });

  it('cùng số nguồn, tin cũ hơn thì nóng thấp hơn', () => {
    expect(pressHeat(5, 0)).toBeGreaterThan(pressHeat(5, 10));
  });

  it('cùng tuổi, nhiều nguồn hơn thì nóng cao hơn', () => {
    expect(pressHeat(10, 5)).toBeGreaterThan(pressHeat(2, 5));
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó FAIL**

Run: `npm test lib/score/heat.test.ts`
Expected: FAIL — không tìm thấy module `./heat`.

- [ ] **Step 3: Viết `lib/score/heat.ts`**

```ts
export function pressHeat(nSources: number, ageHours: number): number {
  return nSources / Math.pow(ageHours + 2, 1.5);
}
```

- [ ] **Step 4: Chạy test cho PASS**

Run: `npm test lib/score/heat.test.ts`
Expected: PASS — 3 test xanh.

- [ ] **Step 5: Viết test fail cho `runScoring` (integration)**

Tạo `lib/score/runScoring.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { runScoring } from './runScoring';
import { pressHeat } from './heat';

const client = createServiceClient();
let clusterId: string;
const FIXED_NOW = new Date('2026-06-24T10:00:00.000Z');

describe('runScoring', () => {
  beforeAll(async () => {
    // cụm test: 4 nguồn, first_seen cách "now" đúng 8 giờ
    const firstSeen = new Date(FIXED_NOW.getTime() - 8 * 3600 * 1000).toISOString();
    const { data } = await client
      .from('clusters')
      .insert({
        topic: '__score_test__', n_sources: 4, post_count: 4,
        first_seen: firstSeen, last_updated: firstSeen, status: 'open',
      })
      .select('id')
      .single();
    clusterId = data!.id;
  });

  afterAll(async () => {
    await client.from('clusters').delete().eq('id', clusterId);
  });

  it('ghi heat_score đúng công thức cho cụm đang mở', async () => {
    const res = await runScoring(client, () => FIXED_NOW);
    expect(res.scored).toBeGreaterThanOrEqual(1);

    const { data } = await client
      .from('clusters').select('heat_score').eq('id', clusterId).single();
    expect(data!.heat_score).toBeCloseTo(pressHeat(4, 8), 5);
  });
});
```

- [ ] **Step 6: Chạy test cho chắc nó FAIL**

Run: `npm test lib/score/runScoring.test.ts`
Expected: FAIL — không tìm thấy module `./runScoring`.

- [ ] **Step 7: Viết `lib/score/runScoring.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { pressHeat } from './heat';

export async function runScoring(
  client: SupabaseClient,
  now: () => Date = () => new Date(),
): Promise<{ scored: number }> {
  const current = now();
  const { data: clusters, error } = await client
    .from('clusters')
    .select('id, n_sources, first_seen')
    .eq('status', 'open');
  if (error) throw new Error(`runScoring đọc clusters lỗi: ${error.message}`);

  let scored = 0;
  for (const c of clusters ?? []) {
    const ageHours = (current.getTime() - new Date(c.first_seen).getTime()) / 3_600_000;
    const heat = pressHeat(c.n_sources, Math.max(0, ageHours));
    await client.from('clusters').update({ heat_score: heat }).eq('id', c.id);
    scored++;
  }
  return { scored };
}
```

- [ ] **Step 8: Chạy test cho PASS**

Run: `npm test lib/score/runScoring.test.ts`
Expected: PASS — heat_score khớp `pressHeat(4, 8)`.

- [ ] **Step 9: Commit**

```bash
git add lib/score/heat.ts lib/score/runScoring.ts lib/score/heat.test.ts lib/score/runScoring.test.ts
git commit -m "feat: xếp độ nóng báo chí (n_sources/(age+2)^1.5) + runScoring"
```

---

### Task 6: API feed + chạy thật trên dữ liệu báo chí

**Files:**
- Create: `lib/feed/getFeed.ts`
- Test: `lib/feed/getFeed.test.ts`
- Create: `app/api/feed/route.ts`
- Create: `scripts/cluster-score.ts`
- Modify: `package.json` (thêm script `dev` và `process:press`)

**Interfaces:**
- Consumes: `getFeed` đọc `clusters` + post đại diện.
- Produces:
  - `interface FeedItem { clusterId: string; title: string; url: string; sourceName: string | null; publishedAt: string; nSources: number; sourceTypes: string[]; heat: number }`
  - `async function getFeed(client: SupabaseClient, limit?: number): Promise<FeedItem[]>` (mặc định `limit = 30`)
  - Route `GET /api/feed` → `{ items: FeedItem[] }`

- [ ] **Step 1: Viết test fail cho `getFeed` (integration)**

Tạo `lib/feed/getFeed.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { upsertPosts } from '../db/posts';
import { getFeed } from './getFeed';

const client = createServiceClient();
let hotId: string;
let coldId: string;

describe('getFeed', () => {
  beforeAll(async () => {
    await client.from('posts').delete().like('url', 'https://example.com/%');
    await client.from('sources').delete().like('name', 'F-%');
    await client.from('clusters').delete().eq('topic', '__feed_test__');

    await upsertPosts(client, [
      {
        sourceType: 'press', sourceName: 'F-One', externalId: 'f1',
        title: 'Tin nóng test', text: '', url: 'https://example.com/f1',
        author: null, publishedAt: '2026-06-24T00:00:00.000Z', lang: null, metrics: {},
      },
    ]);
    const { data: rep } = await client
      .from('posts').select('id').eq('url', 'https://example.com/f1').single();

    const hot = await client.from('clusters').insert({
      topic: '__feed_test__', n_sources: 9, post_count: 9, heat_score: 5,
      status: 'open', representative_post_id: rep!.id,
    }).select('id').single();
    hotId = hot.data!.id;

    const cold = await client.from('clusters').insert({
      topic: '__feed_test__', n_sources: 1, post_count: 1, heat_score: 0.1,
      status: 'open', representative_post_id: rep!.id,
    }).select('id').single();
    coldId = cold.data!.id;
  });

  afterAll(async () => {
    await client.from('clusters').delete().in('id', [hotId, coldId]);
    await client.from('posts').delete().like('url', 'https://example.com/%');
    await client.from('sources').delete().like('name', 'F-%');
  });

  it('trả các cụm xếp theo độ nóng giảm dần, kèm tin đại diện', async () => {
    const items = await getFeed(client, 30);
    const idx = items.findIndex((i) => i.clusterId === hotId);
    const idxCold = items.findIndex((i) => i.clusterId === coldId);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(idxCold);          // cụm nóng đứng trước cụm nguội
    expect(items[idx].title).toBe('Tin nóng test');
    expect(items[idx].sourceName).toBe('F-One');
    expect(items[idx].nSources).toBe(9);
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó FAIL**

Run: `npm test lib/feed/getFeed.test.ts`
Expected: FAIL — không tìm thấy module `./getFeed`.

- [ ] **Step 3: Viết `lib/feed/getFeed.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface FeedItem {
  clusterId: string;
  title: string;
  url: string;
  sourceName: string | null;
  publishedAt: string;
  nSources: number;
  sourceTypes: string[];
  heat: number;
}

export async function getFeed(client: SupabaseClient, limit = 30): Promise<FeedItem[]> {
  const { data: clusters, error } = await client
    .from('clusters')
    .select('id, n_sources, source_types, heat_score, representative_post_id')
    .eq('status', 'open')
    .order('heat_score', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getFeed đọc clusters lỗi: ${error.message}`);

  const repIds = (clusters ?? [])
    .map((c) => c.representative_post_id)
    .filter((id): id is string => Boolean(id));

  const { data: posts } = repIds.length
    ? await client
        .from('posts')
        .select('id, title, url, published_at, sources(name)')
        .in('id', repIds)
    : { data: [] as any[] };

  const postById = new Map((posts ?? []).map((p: any) => [p.id, p]));

  return (clusters ?? [])
    .map((c) => {
      const p = postById.get(c.representative_post_id);
      if (!p) return null;
      const sourceName = Array.isArray(p.sources)
        ? (p.sources[0]?.name ?? null)
        : (p.sources?.name ?? null);
      return {
        clusterId: c.id,
        title: p.title,
        url: p.url,
        sourceName,
        publishedAt: p.published_at,
        nSources: c.n_sources,
        sourceTypes: c.source_types ?? [],
        heat: c.heat_score,
      } satisfies FeedItem;
    })
    .filter((x): x is FeedItem => x !== null);
}
```

- [ ] **Step 4: Chạy test cho PASS**

Run: `npm test lib/feed/getFeed.test.ts`
Expected: PASS — cụm nóng đứng trước, có tiêu đề + tên nguồn.

- [ ] **Step 5: Viết route handler `app/api/feed/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { getFeed } from '@/lib/feed/getFeed';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = createServiceClient();
  const items = await getFeed(client, 30);
  return NextResponse.json({ items });
}
```

- [ ] **Step 6: Viết script chạy thật `scripts/cluster-score.ts`**

```ts
import { createServiceClient } from '../lib/db/client.js';
import { runClustering } from '../lib/cluster/runClustering.js';
import { runScoring } from '../lib/score/runScoring.js';
import { embedText } from '../lib/enrich/embed.js';

async function main() {
  const client = createServiceClient();
  console.log('Đang gom cụm (tạo embedding cho từng tin — lần đầu hơi lâu)...');
  const c = await runClustering(client, { embed: embedText });
  console.log('Gom cụm xong:', c);
  const s = await runScoring(client);
  console.log('Chấm điểm xong:', s);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Thêm scripts:
```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && npm pkg set scripts.dev="next dev" && npm pkg set scripts.process:press="node --env-file=.env.local --import tsx scripts/cluster-score.ts"
```

- [ ] **Step 7: Chạy thật — gom cụm + chấm điểm trên ~495 tin báo**

Run: `npm run process:press`
Expected: in `Gom cụm xong: { processed: N, created: ..., updated: ... }` rồi
`Chấm điểm xong: { scored: ... }`. (Lần đầu chậm vài phút vì tạo embedding cho mọi tin.)

Kiểm tra nhanh có cụm "nhiều nguồn":
```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && node --env-file=.env.local --input-type=module -e "
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { data } = await c.from('clusters').select('n_sources,heat_score').order('heat_score',{ascending:false}).limit(5);
console.log('Top 5 cụm nóng nhất (n_sources, heat):');
for (const x of data) console.log(' -', x.n_sources, 'nguồn  · heat', x.heat_score.toFixed(3));
"
```
Expected: vài cụm có `n_sources ≥ 2` (tin được nhiều báo đưa).

- [ ] **Step 8: Kiểm tra API feed bằng trình duyệt/curl**

Run: `npm run dev` (mở server Next.js), rồi ở cửa sổ khác:
`curl -s http://localhost:3000/api/feed | head -c 800`
Expected: JSON `{"items":[{"clusterId":...,"title":...,"nSources":...,"heat":...}, ...]}`
xếp theo độ nóng. Dừng server bằng Ctrl-C.

- [ ] **Step 9: Commit**

```bash
git add lib/feed/getFeed.ts lib/feed/getFeed.test.ts app/api/feed/route.ts scripts/cluster-score.ts package.json
git commit -m "feat: API feed + script gom cụm/chấm điểm chạy thật trên dữ liệu báo chí"
```

---

## Định nghĩa hoàn thành Phase 2

- `npm test` xanh toàn bộ (Phase 1 + cosine/entities/decide, runClustering, heat, runScoring, getFeed).
- `npm run process:press` gom được tin trùng thành cụm đa nguồn và chấm điểm nóng trên dữ liệu thật.
- `GET /api/feed` trả danh sách cụm xếp theo độ nóng, kèm tin đại diện + số nguồn.

## Bước tiếp theo (Phase 3 — kế hoạch riêng)

Feed UI theo mockup: đọc `/api/feed`, render 3 cột dark-theme, card cụm tin có số nguồn + nút mở cụm.
