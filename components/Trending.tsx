import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime } from '../lib/feed/format';

const SOURCE_ICON: Record<string, string> = {
  press: '📰', youtube: '▶', reddit: '👽', x: '𝕏', tiktok: '♪',
};

function icon(item: FeedItem): string {
  return SOURCE_ICON[item.sourceTypes[0] ?? 'press'] ?? '📰';
}

export function Trending({ items, now }: { items: FeedItem[]; now?: Date }) {
  const today = items.slice(0, 5);
  const refs = items.slice(5, 11);
  return (
    <aside className="rail">
      <section className="panel">
        <div className="panel-title">
          🗞️ Tin hôm nay
          <span className="panel-live"><span className="live-dot" /> LIVE</span>
        </div>
        {today.map((item) => (
          <div className="prow" key={item.clusterId}>
            <span className="prow-icon">{icon(item)}</span>
            <div>
              <div className="prow-title">{item.titleVi ?? item.title}</div>
              <div className="prow-sub">{relativeTime(item.updatedAt ?? item.publishedAt, now)}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-title">⭐ Đáng tham khảo</div>
        {refs.map((item) => (
          <div className="prow" key={item.clusterId}>
            <span className="prow-icon">{icon(item)}</span>
            <div>
              <div className="prow-title">{item.titleVi ?? item.title}</div>
              <div className="prow-sub">
                {item.sourceName ?? 'Nguồn'} · {relativeTime(item.updatedAt ?? item.publishedAt, now)}
              </div>
            </div>
          </div>
        ))}
      </section>
    </aside>
  );
}
