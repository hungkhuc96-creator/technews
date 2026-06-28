'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FeedItem } from '../lib/feed/getFeed';
import { FeedCard } from './FeedCard';
import { HeroCard } from './HeroCard';
import { Sidebar } from './Sidebar';
import { Trending } from './Trending';
import { ReaderPanel } from './ReaderPanel';
import { CATEGORIES, matchCategory } from '../lib/feed/category';

export function FeedApp({ items, counts }: { items: FeedItem[]; counts: Record<string, number> }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [nav, setNav] = useState('Trang chủ');
  const [source, setSource] = useState('all');
  const [category, setCategory] = useState('Tất cả');
  const [query, setQuery] = useState('');
  const [reader, setReader] = useState<FeedItem | null>(null);
  const [now] = useState(() => new Date());

  // Đọc theme đã lưu khi mở trang.
  useEffect(() => {
    const saved = localStorage.getItem('nong-theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);
  // Áp theme lên <html> + lưu lại.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('nong-theme', theme);
  }, [theme]);

  const filtered = useMemo(() => {
    let list = items;
    if (source !== 'all') list = list.filter((it) => (it.sourceTypes[0] ?? 'press') === source);
    if (category !== 'Tất cả') list = list.filter((it) => matchCategory(it.titleVi ?? it.title, category));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((it) => (it.titleVi ?? it.title).toLowerCase().includes(q) || (it.sourceName ?? '').toLowerCase().includes(q));
    }
    if (nav === 'Mới nhất') {
      list = [...list].sort(
        (a, b) => new Date(b.updatedAt ?? b.publishedAt).getTime() - new Date(a.updatedAt ?? a.publishedAt).getTime(),
      );
    }
    return list;
  }, [items, source, nav, category, query]);

  const showHero = source === 'all' && category === 'Tất cả' && !query.trim() && nav === 'Trang chủ';
  const hero = showHero ? filtered[0] : undefined;
  const cards = showHero ? filtered.slice(1) : filtered;

  return (
    <>
      <header className="app-header">
        <span className="logo">nóng<span className="logo-dot" /></span>
        <label className="search">
          <span>🔍</span>
          <input
            placeholder="Tìm tin nóng, chủ đề, nguồn…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="header-actions">
          <span
            className="icon-btn"
            title="Giao diện sáng/tối"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </span>
        </div>
      </header>

      <div className="layout">
        <Sidebar
          counts={counts}
          activeSource={source}
          onSelectSource={setSource}
          activeNav={nav}
          onSelectNav={setNav}
        />

        <main className="feed">
          <div className="chips">
            {CATEGORIES.map((c) => (
              <span
                key={c}
                className={`chip-cat${category === c ? ' active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </span>
            ))}
          </div>

          {filtered.length > 0 && nav === 'Trang chủ' && source === 'all' && category === 'Tất cả' && !query.trim() && (
            <div className="new-pill-wrap">
              <span className="new-pill"><span className="live-dot" /> ↑ {Math.min(filtered.length, 8)} tin mới</span>
            </div>
          )}

          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-faint)', padding: '40px 0', textAlign: 'center' }}>
              Không có tin khớp bộ lọc.
            </p>
          )}

          {hero && <HeroCard item={hero} now={now} onOpen={() => setReader(hero)} />}

          {/* Trên mobile (cột phải bị ẩn): "Tin hôm nay" + "Đáng tham khảo" nằm ngay dưới tin nóng nhất */}
          <div className="rail-mobile">
            <Trending items={items} now={now} onOpen={(it) => setReader(it)} />
          </div>

          {cards.map((item) => (
            <FeedCard key={item.clusterId} item={item} now={now} onOpen={() => setReader(item)} />
          ))}
        </main>

        <Trending items={items} now={now} onOpen={(it) => setReader(it)} />
      </div>

      {reader && <ReaderPanel item={reader} now={now} onClose={() => setReader(null)} />}
    </>
  );
}
