'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeedItem } from '../lib/feed/getFeed';
import { FeedCard } from './FeedCard';
import { HeroCard } from './HeroCard';
import { Sidebar } from './Sidebar';
import { Trending } from './Trending';
import { ReaderPanel } from './ReaderPanel';
import { Logo } from './Logo';
import { CATEGORIES, matchCategory } from '../lib/feed/category';

const BATCH = 20; // số tin xin thêm mỗi lần cuộn tới đáy

export function FeedApp({
  items: initialItems,
  counts,
  initialOffset,
}: {
  items: FeedItem[];
  counts: Record<string, number>;
  initialOffset: number;
}) {
  const [nav, setNav] = useState('Trang chủ');
  const [source, setSource] = useState('all');
  const [category, setCategory] = useState('Tất cả');
  const [query, setQuery] = useState('');
  const [reader, setReader] = useState<FeedItem | null>(null);
  const [menuOpen, setMenuOpen] = useState(false); // menu gộp góc phải (mobile)
  const [now] = useState(() => new Date());

  // Cuộn vô hạn — 2 "kho" riêng: Trang chủ (độ nóng, nạp sẵn từ server) và
  // Mới nhất (thuần thời gian trên TOÀN KHO, fetch riêng ?sort=recent).
  const mode: 'heat' | 'recent' = nav === 'Mới nhất' ? 'recent' : 'heat';
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [nextOffset, setNextOffset] = useState(initialOffset);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [recentItems, setRecentItems] = useState<FeedItem[]>([]);
  const [recentOffset, setRecentOffset] = useState(0);
  const [recentEnd, setRecentEnd] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    if (mode === 'heat' ? reachedEnd : recentEnd) return;
    setLoadingMore(true);
    try {
      const offset = mode === 'heat' ? nextOffset : recentOffset;
      const r = await fetch(`/api/feed?offset=${offset}&limit=${BATCH}${mode === 'recent' ? '&sort=recent' : ''}`);
      if (!r.ok) throw new Error(`feed ${r.status}`);
      const d = await r.json();
      const incoming: FeedItem[] = Array.isArray(d.items) ? d.items : [];
      const append = (prev: FeedItem[]) => {
        const seen = new Set(prev.map((p) => p.clusterId));
        return [...prev, ...incoming.filter((it) => !seen.has(it.clusterId))];
      };
      if (mode === 'heat') {
        setItems(append);
        setNextOffset((o) => o + BATCH);
        if (incoming.length < BATCH) setReachedEnd(true);
      } else {
        setRecentItems(append);
        setRecentOffset((o) => o + BATCH);
        if (incoming.length < BATCH) setRecentEnd(true);
      }
      setLoadError(false);
    } catch {
      setLoadError(true); // hiện toast + dừng tự-nạp cho tới khi bấm "Thử lại"
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, mode, reachedEnd, recentEnd, nextOffset, recentOffset]);

  // Vào tab "Mới nhất" lần đầu → nạp trang đầu từ server.
  useEffect(() => {
    if (mode === 'recent' && recentItems.length === 0 && !recentEnd) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // "Mắt cảm biến" ở đáy: tới gần là tự nạp thêm (rootMargin 600px = nạp sớm).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadError) loadMore();
      },
      { rootMargin: '600px' },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [loadMore, loadError]);

  const filtered = useMemo(() => {
    // "Mới nhất" dùng kho server (đã đúng thứ tự thời gian trên toàn kho).
    let list = mode === 'recent' ? recentItems : items;
    if (source !== 'all') list = list.filter((it) => (it.sourceTypes[0] ?? 'press') === source);
    if (category !== 'Tất cả') list = list.filter((it) => matchCategory(it.titleVi ?? it.title, category));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((it) => (it.titleVi ?? it.title).toLowerCase().includes(q) || (it.sourceName ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [items, recentItems, mode, source, category, query]);

  const showHero = source === 'all' && category === 'Tất cả' && !query.trim() && nav === 'Trang chủ';
  const hero = showHero ? filtered[0] : undefined;
  const cards = showHero ? filtered.slice(1) : filtered;

  return (
    <>
      <header className="app-header">
        <Logo />
        <label className="search">
          <span>🔍</span>
          <input
            placeholder="Tìm tin nóng, chủ đề, nguồn…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="header-actions">
          {/* Mobile: 1 menu gộp (cột trái bị ẩn). Icon đổi ☰→✕ + nền nổi bật khi mở
              để việc bấm luôn có phản hồi rõ ràng (trước đây bấm xong không thấy gì đổi). */}
          <div className="menu-wrap">
            <span
              className={`icon-btn menu-btn${menuOpen ? ' open' : ''}`}
              title="Menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? '✕' : '☰'}
            </span>
            {menuOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="menu-drop">
                  <div
                    className={`menu-item${nav === 'Trang chủ' ? ' active' : ''}`}
                    onClick={() => { setNav('Trang chủ'); setMenuOpen(false); }}
                  >🏠 Trang chủ</div>
                  <div
                    className={`menu-item${nav === 'Mới nhất' ? ' active' : ''}`}
                    onClick={() => { setNav('Mới nhất'); setMenuOpen(false); }}
                  >🕐 Mới nhất</div>
                  <a
                    className="menu-item"
                    href="https://dealhungkhuc.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                  >🎁 Deal người nhà</a>
                </div>
              </>
            )}
          </div>
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

          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-faint)', padding: '40px 0', textAlign: 'center' }}>
              Không có tin khớp bộ lọc.
            </p>
          )}

          {hero && <HeroCard item={hero} now={now} onOpen={() => setReader(hero)} />}

          {/* Trên mobile (cột phải bị ẩn): chỉ "Tin nóng" (bỏ "Tin hôm nay" cho gọn) */}
          <div className="rail-mobile">
            <Trending items={items} now={now} onOpen={(it) => setReader(it)} showRecent={false} />
          </div>

          {cards.map((item) => (
            <FeedCard key={item.clusterId} item={item} now={now} onOpen={() => setReader(item)} />
          ))}

          {/* Cuộn vô hạn: mắt cảm biến + trạng thái nạp thêm */}
          <div ref={sentinelRef} className="feed-sentinel" />
          {loadingMore && <p className="feed-more">⚡ Đang tải thêm tin…</p>}
          {loadError && !loadingMore && (
            <div className="feed-error" role="alert">
              <span>Mạng trục trặc, chưa tải được thêm tin.</span>
              <button type="button" onClick={() => { setLoadError(false); loadMore(); }}>
                Thử lại
              </button>
            </div>
          )}
          {(mode === 'heat' ? reachedEnd : recentEnd) && !loadingMore && cards.length > 0 && (
            <p className="feed-more feed-end">Bạn đã xem hết tin rồi 🎉</p>
          )}
        </main>

        <Trending items={items} now={now} onOpen={(it) => setReader(it)} />
      </div>

      {reader && <ReaderPanel item={reader} now={now} onClose={() => setReader(null)} />}
    </>
  );
}
