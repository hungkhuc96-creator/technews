import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime, sourceLabel, compactNumber } from '../lib/feed/format';

const SOURCE_ICON: Record<string, string> = {
  press: '📰', youtube: '▶', reddit: '👽', x: '𝕏', tiktok: '♪',
};

function See() {
  return <span className="see">Xem tin →</span>;
}

// ===== Thẻ X =====
function XCard({ item, ts }: { item: FeedItem; ts: string }) {
  const m = item.metrics;
  return (
    <>
      <div className="card-meta">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="x-avatar" src={item.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="x-avatar x-avatar-fb">𝕏</span>
        )}
        <span className="x-name">{item.authorName ?? item.sourceName}</span>
        <span>· {item.sourceName} · {ts}</span>
      </div>
      <p className="x-tweet">{item.title}</p>
      <div className="card-foot">
        <See />
        <span className="foot-right x-eng">
          {m.likes ? <span>♥ {compactNumber(m.likes)}</span> : null}
          {m.reposts ? <span>⇄ {compactNumber(m.reposts)}</span> : null}
          {m.comments ? <span>💬 {compactNumber(m.comments)}</span> : null}
          {m.views ? <span>👁 {compactNumber(m.views)}</span> : null}
        </span>
      </div>
    </>
  );
}

// ===== Thẻ YouTube =====
function YouTubeCard({ item, ts }: { item: FeedItem; ts: string }) {
  const views = item.metrics.views ? `${compactNumber(item.metrics.views)} lượt xem · ` : '';
  return (
    <>
      {item.imageUrl && (
        <div className="video-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="card-thumb" src={item.imageUrl} alt="" loading="lazy" />
          <span className="video-play">▶</span>
        </div>
      )}
      <div className="card-meta">
        <span>▶ {item.sourceName ?? 'YouTube'}</span>
        <span>· {views}{ts}</span>
      </div>
      <h3 className="card-title">{item.titleVi ?? item.title}</h3>
      {item.summary && <p className="card-summary">{item.summary}</p>}
      <div className="card-foot"><See /></div>
    </>
  );
}

// ===== Thẻ báo chí (mặc định) =====
function PressCard({ item, ts, isUpdated }: { item: FeedItem; ts: string; isUpdated: boolean }) {
  const icon = SOURCE_ICON[item.sourceTypes[0] ?? 'press'] ?? '📰';
  const hot = item.nSources >= 3;
  return (
    <>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="card-thumb" src={item.imageUrl} alt="" loading="lazy" />
      )}
      <div className="card-meta">
        <span>{icon} {item.sourceName ?? 'Nguồn'}</span>
        <span>· {isUpdated ? 'cập nhật ' : ''}{ts}</span>
        {hot && <span className="meta-hot">🔥 Nóng</span>}
      </div>
      <h3 className="card-title">{item.titleVi ?? item.title}</h3>
      {item.summary ? (
        <p className="card-summary">{item.summary}</p>
      ) : item.bullets.length > 0 ? (
        <ul className="card-bullets">
          {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      ) : null}
      <div className="card-foot">
        <See />
        <span className="foot-right">
          {item.sources.length > 0 && (
            <span className="mini-avatars">
              {item.sources.map((a, i) => (
                <span key={i} className="mini-avatar" style={{ background: a.color }}>{a.initial}</span>
              ))}
            </span>
          )}
          <span>{sourceLabel(item.nSources)}</span>
        </span>
      </div>
    </>
  );
}

export function FeedCard({ item, now, onOpen }: { item: FeedItem; now?: Date; onOpen?: () => void }) {
  const type = item.sourceTypes[0] ?? 'press';
  const isUpdated = !!item.updatedAt && item.updatedAt !== item.publishedAt;
  const ts = relativeTime(item.updatedAt ?? item.publishedAt, now);
  return (
    <article className="card" onClick={onOpen}>
      {type === 'x' ? (
        <XCard item={item} ts={ts} />
      ) : type === 'youtube' ? (
        <YouTubeCard item={item} ts={ts} />
      ) : (
        <PressCard item={item} ts={ts} isUpdated={isUpdated} />
      )}
    </article>
  );
}
