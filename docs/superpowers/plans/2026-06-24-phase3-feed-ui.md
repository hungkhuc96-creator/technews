# Phase 3: Giao diện Feed (đọc /api/feed) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng trang web feed dark-theme theo mockup — đọc dữ liệu cụm tin thật từ DB và hiển thị thành các card xếp theo độ nóng, kèm cột "Đang nóng".

**Architecture:** Trang chủ là **Server Component** của Next.js, gọi thẳng `getFeed()` (Phase 2) để render sẵn ở server với dữ liệu thật. Logic thuần (định dạng thời gian, nhãn nguồn) tách ra `lib/feed/format.ts` để test. Giao diện chia thành component nhỏ: `FeedCard`, `Sidebar`, `Trending`. Theme bằng biến CSS trong `globals.css`.

**Tech Stack:** Next.js App Router (React Server Components), TypeScript, `next/font` (Inter + Space Grotesk), Vitest + @testing-library/react + jsdom (test component), CSS thuần (biến CSS, không framework).

## Global Constraints

- Next.js App Router; trang server-side đọc dữ liệu qua `getFeed` (Phase 2).
- Bảng màu (từ mockup): `--bg #0B0B0F`, `--surface #131318`, `--surface-2 #1B1B22`, `--border rgba(255,255,255,.09)`, `--text #F5F3EC`, `--text-dim rgba(245,243,236,.64)`, `--text-faint rgba(245,243,236,.44)`, `--accent #E8FF3A`, `--accent-ink #0B0B0F`, `--heat #FF4D2E`.
- Font: **Inter** (chữ thường), **Space Grotesk** (logo/tiêu đề).
- Tiếng Việt toàn bộ phần giao diện.
- Chỉ hiển thị **tóm tắt/tiêu đề + link nguồn gốc** (bản quyền) — không đăng toàn văn.
- Mỗi card cụm hiển thị **số nguồn đưa tin** + thời gian tương đối.
- TDD cho logic thuần; component verify bằng test render + xem trực tiếp trên trình duyệt.

---

### Task 1: Hàm định dạng hiển thị (logic thuần)

**Files:**
- Create: `lib/feed/format.ts`
- Test: `lib/feed/format.test.ts`

**Interfaces:**
- Produces:
  - `function relativeTime(iso: string, now?: Date): string` — "vừa xong" / "N phút trước" / "N giờ trước" / "N ngày trước"
  - `function sourceLabel(nSources: number): string` — "1 nguồn" / "N nguồn đưa tin"

- [ ] **Step 1: Viết test fail**

Tạo `lib/feed/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { relativeTime, sourceLabel } from './format';

const now = new Date('2026-06-24T12:00:00.000Z');

describe('relativeTime', () => {
  it('dưới 1 phút → "vừa xong"', () => {
    expect(relativeTime('2026-06-24T11:59:30.000Z', now)).toBe('vừa xong');
  });
  it('phút', () => {
    expect(relativeTime('2026-06-24T11:45:00.000Z', now)).toBe('15 phút trước');
  });
  it('giờ', () => {
    expect(relativeTime('2026-06-24T09:00:00.000Z', now)).toBe('3 giờ trước');
  });
  it('ngày', () => {
    expect(relativeTime('2026-06-22T12:00:00.000Z', now)).toBe('2 ngày trước');
  });
});

describe('sourceLabel', () => {
  it('1 nguồn', () => {
    expect(sourceLabel(1)).toBe('1 nguồn');
  });
  it('nhiều nguồn', () => {
    expect(sourceLabel(7)).toBe('7 nguồn đưa tin');
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó FAIL**

Run: `npm test lib/feed/format.test.ts`
Expected: FAIL — không tìm thấy module `./format`.

- [ ] **Step 3: Viết `lib/feed/format.ts`**

```ts
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const day = Math.floor(hour / 24);
  return `${day} ngày trước`;
}

export function sourceLabel(nSources: number): string {
  return nSources <= 1 ? '1 nguồn' : `${nSources} nguồn đưa tin`;
}
```

- [ ] **Step 4: Chạy test cho PASS**

Run: `npm test lib/feed/format.test.ts`
Expected: PASS — 6 test xanh.

- [ ] **Step 5: Commit**

```bash
git add lib/feed/format.ts lib/feed/format.test.ts
git commit -m "feat: hàm định dạng thời gian tương đối + nhãn số nguồn"
```

---

### Task 2: Theme + layout gốc + cài testing-library

**Files:**
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx` (tạm thời: chỉ header, để xem theme)
- Modify: `vitest.config.ts` (thêm jsdom cho test component)

**Interfaces:**
- Produces: layout gốc dark-theme + lớp CSS dùng chung (`.app-header`, `.layout`, `.sidebar`, `.feed`, `.card`, `.chip`, …).

- [ ] **Step 1: Cài thư viện test giao diện**

```bash
cd "/Users/thinkview/Desktop/Học vibe code/Technews" && npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Viết `app/globals.css`**

```css
:root {
  --bg: #0B0B0F;
  --surface: #131318;
  --surface-2: #1B1B22;
  --border: rgba(255, 255, 255, 0.09);
  --text: #F5F3EC;
  --text-dim: rgba(245, 243, 236, 0.64);
  --text-faint: rgba(245, 243, 236, 0.44);
  --accent: #E8FF3A;
  --accent-ink: #0B0B0F;
  --heat: #FF4D2E;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-inter), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }

.app-header {
  position: sticky; top: 0; z-index: 50; height: 56px;
  display: flex; align-items: center; gap: 16px; padding: 0 20px;
  background: var(--bg); border-bottom: 1px solid var(--border);
}
.logo {
  font-family: var(--font-grotesk), sans-serif; font-weight: 700;
  font-size: 22px; letter-spacing: -0.03em;
}
.logo-dot {
  width: 9px; height: 9px; border-radius: 999px;
  background: var(--accent); display: inline-block; margin-left: 3px;
}
.live {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px;
  border-radius: 7px; background: var(--surface-2);
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--text-dim);
}
.live-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--heat); }

.layout {
  max-width: 1280px; margin: 0 auto; padding: 22px 20px 90px;
  display: flex; gap: 28px; align-items: flex-start;
}
.sidebar { width: 210px; flex: 0 0 auto; position: sticky; top: 78px; }
.feed { flex: 1 1 0%; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.trending { width: 300px; flex: 0 0 auto; position: sticky; top: 78px; }

.nav-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-radius: 11px; font-size: 15px; font-weight: 600; color: var(--text-dim);
}
.nav-item.active { background: var(--accent); color: var(--accent-ink); }
.side-title {
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
  color: var(--text-faint); margin: 18px 0 8px 12px;
}

.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 14px; padding: 16px 18px;
}
.card:hover { border-color: rgba(255, 255, 255, 0.18); }
.card-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-faint); margin-bottom: 8px; }
.chip {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px;
  border-radius: 7px; background: var(--surface-2); font-size: 11px; color: var(--text-dim);
}
.chip-heat { color: var(--heat); font-weight: 700; }
.card-title { font-size: 17px; font-weight: 650; line-height: 1.35; margin: 0 0 8px; }
.card-foot { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-faint); }

.trend-row { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
.trend-rank { font-family: var(--font-grotesk), sans-serif; font-weight: 700; color: var(--text-faint); width: 18px; }
.trend-title { font-size: 13px; line-height: 1.3; color: var(--text); }
.trend-sub { font-size: 11px; color: var(--text-faint); margin-top: 2px; }
```

- [ ] **Step 3: Viết `app/layout.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk' });

export const metadata = {
  title: 'nóng — Feed tin công nghệ',
  description: 'Tổng hợp tin công nghệ nóng nhất, tóm tắt tiếng Việt.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${grotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Viết `app/page.tsx` tạm (chỉ header)**

```tsx
export default function Home() {
  return (
    <header className="app-header">
      <span className="logo">nóng<span className="logo-dot" /></span>
      <span className="live"><span className="live-dot" /> LIVE</span>
    </header>
  );
}
```

- [ ] **Step 5: Thêm jsdom cho test component trong `vitest.config.ts`**

Sửa khối `test` để cho phép chọn môi trường jsdom theo từng file (qua chú thích
`// @vitest-environment jsdom`). Đổi:

```ts
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // Các test tích hợp dùng chung 1 database đám mây → chạy tuần tự để không giẫm chân nhau.
    fileParallelism: false,
  },
```
thành:
```ts
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    // Các test tích hợp dùng chung 1 database đám mây → chạy tuần tự để không giẫm chân nhau.
    fileParallelism: false,
  },
```

- [ ] **Step 6: Xem theme trên trình duyệt**

Run: `npm run dev` rồi mở `http://localhost:3000`.
Expected: nền đen, logo "nóng" màu sáng + chấm vàng, nhãn "LIVE" chấm đỏ. Ctrl-C để dừng.

- [ ] **Step 7: Chạy lại toàn bộ test cho chắc không vỡ**

Run: `npm test`
Expected: tất cả test cũ vẫn xanh.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css app/layout.tsx app/page.tsx vitest.config.ts package.json package-lock.json
git commit -m "feat: theme dark + layout gốc + header; cài testing-library/jsdom"
```

---

### Task 3: Component `FeedCard` (+ test render)

**Files:**
- Create: `components/FeedCard.tsx`
- Test: `components/FeedCard.test.tsx`

**Interfaces:**
- Consumes: `FeedItem` (Phase 2, `lib/feed/getFeed.ts`), `relativeTime`/`sourceLabel` (Task 1).
- Produces: `function FeedCard({ item, now }: { item: FeedItem; now?: Date }): JSX.Element`

- [ ] **Step 1: Viết test fail (render bằng jsdom)**

Tạo `components/FeedCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FeedCard } from './FeedCard';
import type { FeedItem } from '../lib/feed/getFeed';

afterEach(cleanup);

const item: FeedItem = {
  clusterId: 'c1',
  title: 'OpenAI ra mắt GPT-5.2',
  url: 'https://example.com/gpt',
  sourceName: 'The Verge',
  publishedAt: '2026-06-24T11:00:00.000Z',
  nSources: 7,
  sourceTypes: ['press'],
  heat: 0.5,
};

describe('FeedCard', () => {
  it('hiển thị tiêu đề, tên nguồn và nhãn số nguồn', () => {
    render(<FeedCard item={item} now={new Date('2026-06-24T12:00:00.000Z')} />);
    expect(screen.getByText('OpenAI ra mắt GPT-5.2')).toBeDefined();
    expect(screen.getByText('The Verge')).toBeDefined();
    expect(screen.getByText('7 nguồn đưa tin')).toBeDefined();
    expect(screen.getByText('1 giờ trước')).toBeDefined();
  });

  it('tiêu đề là link tới bài gốc, mở tab mới', () => {
    render(<FeedCard item={item} now={new Date('2026-06-24T12:00:00.000Z')} />);
    const link = screen.getByRole('link', { name: /GPT-5.2/ }) as HTMLAnchorElement;
    expect(link.href).toContain('example.com/gpt');
    expect(link.target).toBe('_blank');
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó FAIL**

Run: `npm test components/FeedCard.test.tsx`
Expected: FAIL — không tìm thấy module `./FeedCard`.

- [ ] **Step 3: Viết `components/FeedCard.tsx`**

```tsx
import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime, sourceLabel } from '../lib/feed/format';

const SOURCE_ICON: Record<string, string> = {
  press: '📰', youtube: '▶', reddit: '👽', x: '𝕏', tiktok: '🎵',
};

export function FeedCard({ item, now }: { item: FeedItem; now?: Date }) {
  const icon = SOURCE_ICON[item.sourceTypes[0] ?? 'press'] ?? '📰';
  const hot = item.nSources >= 3;
  return (
    <article className="card">
      <div className="card-meta">
        <span className="chip">{icon} {item.sourceName ?? 'Nguồn'}</span>
        {hot && <span className="chip chip-heat">🔥 {sourceLabel(item.nSources)}</span>}
        <span>· {relativeTime(item.publishedAt, now)}</span>
      </div>
      <h3 className="card-title">
        <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
      </h3>
      <div className="card-foot">
        {!hot && <span>{sourceLabel(item.nSources)}</span>}
        <span>Mở cụm tin →</span>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Chạy test cho PASS**

Run: `npm test components/FeedCard.test.tsx`
Expected: PASS — 2 test xanh.

- [ ] **Step 5: Commit**

```bash
git add components/FeedCard.tsx components/FeedCard.test.tsx
git commit -m "feat: component FeedCard (card cụm tin) + test render"
```

---

### Task 4: Trang chủ — sidebar + trending + feed dữ liệu thật

**Files:**
- Create: `components/Sidebar.tsx`
- Create: `components/Trending.tsx`
- Modify: `app/page.tsx` (thay bản tạm bằng trang đầy đủ)

**Interfaces:**
- Consumes: `getFeed` (Phase 2), `createServiceClient` (Phase 1), `FeedCard` (Task 3), `FeedItem`, `relativeTime`/`sourceLabel` (Task 1).

- [ ] **Step 1: Viết `components/Sidebar.tsx` (điều hướng tĩnh cho v1)**

```tsx
export function Sidebar() {
  const nav = [
    { icon: '🏠', label: 'Trang chủ', active: true },
    { icon: '🔥', label: 'Đang nóng', active: false },
    { icon: '🕐', label: 'Mới nhất', active: false },
  ];
  const sources = ['Tất cả nguồn', 'Báo chí'];
  return (
    <aside className="sidebar">
      <nav>
        {nav.map((n) => (
          <div key={n.label} className={`nav-item${n.active ? ' active' : ''}`}>
            <span>{n.icon}</span>{n.label}
          </div>
        ))}
      </nav>
      <div className="side-title">NGUỒN TIN</div>
      <nav>
        {sources.map((s) => (
          <div key={s} className="nav-item">{s}</div>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Viết `components/Trending.tsx`**

```tsx
import type { FeedItem } from '../lib/feed/getFeed';
import { sourceLabel } from '../lib/feed/format';

export function Trending({ items }: { items: FeedItem[] }) {
  const top = items.slice(0, 5);
  return (
    <aside className="trending">
      <div className="side-title">🔥 ĐANG NÓNG</div>
      {top.map((item, i) => (
        <div className="trend-row" key={item.clusterId}>
          <span className="trend-rank">{i + 1}</span>
          <div>
            <div className="trend-title">{item.title}</div>
            <div className="trend-sub">{sourceLabel(item.nSources)}</div>
          </div>
        </div>
      ))}
    </aside>
  );
}
```

- [ ] **Step 3: Thay `app/page.tsx` bằng trang đầy đủ (Server Component, đọc DB thật)**

```tsx
import { createServiceClient } from '@/lib/db/client';
import { getFeed } from '@/lib/feed/getFeed';
import { FeedCard } from '@/components/FeedCard';
import { Sidebar } from '@/components/Sidebar';
import { Trending } from '@/components/Trending';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const items = await getFeed(createServiceClient(), 40);
  return (
    <>
      <header className="app-header">
        <span className="logo">nóng<span className="logo-dot" /></span>
        <span className="live"><span className="live-dot" /> LIVE</span>
      </header>
      <div className="layout">
        <Sidebar />
        <main className="feed">
          {items.length === 0 && <p style={{ color: 'var(--text-faint)' }}>Chưa có tin. Chạy <code>npm run ingest:press</code> rồi <code>npm run process:press</code>.</p>}
          {items.map((item) => (
            <FeedCard key={item.clusterId} item={item} />
          ))}
        </main>
        <Trending items={items} />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Xem trang thật trên trình duyệt**

Run: `npm run dev` → mở `http://localhost:3000`.
Expected: feed 3 cột — trái là điều hướng, giữa là các card cụm tin THẬT (tiêu đề
báo, "N nguồn đưa tin", thời gian), phải là "Đang nóng" top 5. Ctrl-C để dừng.

- [ ] **Step 5: Chụp màn hình kiểm chứng**

Run: chụp ảnh `http://localhost:3000` (hoặc xem trực tiếp) để xác nhận bố cục
khớp tinh thần mockup (nền đen, card sáng, nhấn vàng/đỏ).

- [ ] **Step 6: Chạy lại toàn bộ test**

Run: `npm test`
Expected: tất cả test xanh (gồm cả test component mới).

- [ ] **Step 7: Commit**

```bash
git add components/Sidebar.tsx components/Trending.tsx app/page.tsx
git commit -m "feat: trang chủ feed — sidebar + trending + card cụm tin dữ liệu thật"
```

---

## Định nghĩa hoàn thành Phase 3

- `npm test` xanh toàn bộ (gồm format + FeedCard render).
- `npm run dev` → mở trình duyệt thấy **feed 3 cột dark-theme với tin thật**, card có số nguồn + thời gian, cột "Đang nóng" bên phải.
- Bấm tiêu đề mở bài gốc ở tab mới.

## Bước tiếp theo (Phase 4 — kế hoạch riêng)

Tóm tắt AI tiếng Việt ở cấp cụm (Claude) → hiển thị 2–3 câu bullet trong mỗi card thay cho chỉ tiêu đề.
