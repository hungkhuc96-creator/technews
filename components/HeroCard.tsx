import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime } from '../lib/feed/format';

// Thẻ HERO vàng cho tin nóng nhất (thường là cụm báo chí nhiều nguồn).
export function HeroCard({ item, now, onOpen }: { item: FeedItem; now?: Date; onOpen?: () => void }) {
  const title = item.titleVi ?? item.title;
  const ts = item.updatedAt ?? item.publishedAt;
  const isUpdated = !!item.updatedAt && item.updatedAt !== item.publishedAt;
  const initial = (item.sourceName ?? 'N').trim().charAt(0).toUpperCase();
  return (
    <article className="hero" onClick={onOpen}>
      <span className="hero-flame">🔥</span>
      <div className="hero-meta">
        <span>{item.sourceName ?? 'Nguồn'}</span>
        <span className="dot">·</span>
        <span>🔥 Nóng nhất</span>
        <span className="dot">·</span>
        <span>{isUpdated ? 'cập nhật ' : ''}{relativeTime(ts, now)}</span>
      </div>
      <h2 className="hero-title">{title}</h2>
      {item.bullets.length > 0 ? (
        <ul className="hero-bullets">
          {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      ) : (
        item.summary && <p className="hero-summary">{item.summary}</p>
      )}
      <div className="hero-foot">
        <span className="hero-sources">
          <span className="savatar" style={{ background: 'var(--accent-ink)', color: 'var(--accent)' }}>{initial}</span>
        </span>
        <span className="hero-srctext">{item.nSources} nguồn đưa tin</span>
        <button className="hero-btn" onClick={onOpen}>Đọc tiếp &amp; bản dịch →</button>
      </div>
    </article>
  );
}
