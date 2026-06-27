import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime } from '../lib/feed/format';

const SOURCE_ICON: Record<string, string> = {
  press: '📰', youtube: '▶', reddit: '👽', x: '𝕏', tiktok: '♪',
};

// Panel chi tiết trượt ra khi bấm một thẻ tin.
export function ReaderPanel({ item, now, onClose }: { item: FeedItem; now?: Date; onClose: () => void }) {
  const icon = SOURCE_ICON[item.sourceTypes[0] ?? 'press'] ?? '📰';
  const title = item.titleVi ?? item.title;
  const hasAi = !!item.summary || item.bullets.length > 0;
  return (
    <div className="reader-overlay" onClick={onClose}>
      <div className="reader" onClick={(e) => e.stopPropagation()}>
        <div className="reader-top">
          <span className="reader-close" onClick={onClose}>✕</span>
        </div>

        <div className="reader-meta">
          <span>{icon} {item.sourceName ?? 'Nguồn'}</span>
          <span>·</span>
          <span>{item.nSources > 1 ? `${item.nSources} nguồn · ` : ''}{relativeTime(item.updatedAt ?? item.publishedAt, now)}</span>
        </div>

        <h1 className="reader-title">{title}</h1>

        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="reader-thumb" src={item.imageUrl} alt="" />
        )}

        {hasAi && (
          <div className="reader-ai">
            <div className="reader-ai-label">✨ TÓM TẮT AI</div>
            {item.summary && <p className="reader-summary">{item.summary}</p>}
            {item.bullets.length > 0 && (
              <ul className="reader-bullets">
                {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}
          </div>
        )}

        <a className="reader-orig" href={item.url} target="_blank" rel="noopener noreferrer">
          Xem bài gốc →
        </a>
      </div>
    </div>
  );
}
