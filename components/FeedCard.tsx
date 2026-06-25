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
      {item.bullets.length > 0 && (
        <ul className="card-bullets">
          {item.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      <div className="card-foot">
        {!hot && <span>{sourceLabel(item.nSources)}</span>}
        <span>Mở cụm tin →</span>
      </div>
    </article>
  );
}
