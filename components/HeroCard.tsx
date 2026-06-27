import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime } from '../lib/feed/format';

const SOURCE_ICON: Record<string, string> = {
  press: '📰', youtube: '▶', reddit: '👽', x: '𝕏', tiktok: '♪',
};

// Thẻ HERO vàng cho tin nóng nhất (thường là cụm báo chí nhiều nguồn).
export function HeroCard({ item, now, onOpen }: { item: FeedItem; now?: Date; onOpen?: () => void }) {
  const title = item.titleVi ?? item.title;
  const icon = SOURCE_ICON[item.sourceTypes[0] ?? 'press'] ?? '📰';
  const ts = item.updatedAt ?? item.publishedAt;
  const avatars = item.sources.length > 0
    ? item.sources
    : [{ initial: (item.sourceName ?? 'N').trim().charAt(0).toUpperCase(), color: 'var(--accent-ink)', logo: null as string | null }];
  return (
    <article className="hero" onClick={onOpen}>
      <span className="hero-flame">🔥</span>
      <div className="hero-meta">
        <span>{icon} {item.sourceName ?? 'Nguồn'}</span>
        <span className="dot">·</span>
        <span>🔥 Nóng nhất</span>
        <span className="dot">·</span>
        <span>⚡ {relativeTime(ts, now)}</span>
      </div>
      <h2 className="hero-title">{title}</h2>
      {item.summary ? (
        <p className="hero-summary">{item.summary}</p>
      ) : item.bullets.length > 0 ? (
        <ul className="hero-bullets">
          {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      ) : null}
      <div className="hero-foot">
        <span className="hero-sources">
          {avatars.map((a, i) => (
            a.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} className="savatar savatar-logo" src={a.logo} alt="" loading="lazy" />
            ) : (
              <span key={i} className="savatar" style={{ background: a.color, color: '#fff' }}>{a.initial}</span>
            )
          ))}
        </span>
        <span className="hero-srctext">{item.nSources} nguồn đưa tin</span>
        <button className="hero-btn" onClick={onOpen}>Xem tin →</button>
      </div>
    </article>
  );
}
