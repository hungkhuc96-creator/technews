import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime } from '../lib/feed/format';
import { feedLogo } from '../lib/feed/sourceLogos';

function Row({ item, now, onOpen }: { item: FeedItem; now?: Date; onOpen?: (i: FeedItem) => void }) {
  const type = item.sourceTypes[0] ?? 'press';
  const name = type === 'x' ? (item.authorName ?? item.sourceName)?.replace(/\.(com|net)$/i, '') : item.sourceName;
  return (
    <div className="prow" onClick={() => onOpen?.(item)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="src-logo" src={feedLogo(type, item.sourceName)} alt="" loading="lazy" />
      <div>
        <div className="prow-title">{item.titleVi ?? item.title}</div>
        <div className="prow-sub">{name ?? 'Nguồn'} · {relativeTime(item.updatedAt ?? item.publishedAt, now)}</div>
      </div>
    </div>
  );
}

export function Trending({
  items, now, onOpen,
}: {
  items: FeedItem[];
  now?: Date;
  onOpen?: (item: FeedItem) => void;
}) {
  const today = items.slice(0, 8);
  const refs = items.slice(8, 14);
  return (
    <aside className="rail">
      <section className="panel">
        <div className="panel-title">
          🗞️ Tin hôm nay
          <span className="panel-live"><span className="live-dot" /> LIVE</span>
        </div>
        {/* Tự cuộn: nhân đôi danh sách để lặp liền mạch */}
        <div className="ticker-view">
          <div className="ticker-track">
            {[...today, ...today].map((item, i) => (
              <Row key={`${item.clusterId}-${i}`} item={item} now={now} onOpen={onOpen} />
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">⭐ Đáng tham khảo</div>
        {refs.map((item) => (
          <Row key={item.clusterId} item={item} now={now} onOpen={onOpen} />
        ))}
      </section>
    </aside>
  );
}
