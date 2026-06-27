import { createServiceClient } from '@/lib/db/client';
import { getFeed } from '@/lib/feed/getFeed';
import { FeedCard } from '@/components/FeedCard';
import { HeroCard } from '@/components/HeroCard';
import { Sidebar } from '@/components/Sidebar';
import { Trending } from '@/components/Trending';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['Tất cả', 'AI', 'Điện thoại', 'Laptop', 'Apple', 'Android', 'Game'];

export default async function Home() {
  const items = await getFeed(createServiceClient(), 40);

  // Đếm số card mỗi nguồn (thật) cho thanh "Lọc nguồn".
  const counts: Record<string, number> = {};
  for (const it of items) {
    const k = it.sourceTypes[0] ?? 'press';
    counts[k] = (counts[k] ?? 0) + 1;
  }

  const [hero, ...rest] = items;

  return (
    <>
      <header className="app-header">
        <span className="logo">nóng<span className="logo-dot" /></span>
        <label className="search">
          <span>🔍</span>
          <input placeholder="Tìm tin nóng, chủ đề, nguồn…" />
        </label>
        <div className="header-actions">
          <span className="icon-btn" title="Giao diện sáng/tối">☀</span>
        </div>
      </header>

      <div className="layout">
        <Sidebar counts={counts} />

        <main className="feed">
          {items.length === 0 && (
            <p style={{ color: 'var(--text-faint)' }}>
              Chưa có tin. Chạy <code>npm run ingest:press</code> rồi{' '}
              <code>npm run process:press</code>.
            </p>
          )}

          <div className="chips">
            {CATEGORIES.map((c, i) => (
              <span key={c} className={`chip-cat${i === 0 ? ' active' : ''}`}>{c}</span>
            ))}
          </div>

          {items.length > 0 && (
            <div className="new-pill-wrap">
              <span className="new-pill"><span className="live-dot" /> ↑ {Math.min(items.length, 8)} tin mới</span>
            </div>
          )}

          {hero && <HeroCard item={hero} />}
          {rest.map((item) => (
            <FeedCard key={item.clusterId} item={item} />
          ))}
        </main>

        <Trending items={items} />
      </div>
    </>
  );
}
