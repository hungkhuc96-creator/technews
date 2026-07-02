import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime } from '../lib/feed/format';
import { metaFor } from '../lib/feed/sourceMeta';

function Row({ item, now, onOpen }: { item: FeedItem; now?: Date; onOpen?: (i: FeedItem) => void }) {
  const type = item.sourceTypes[0] ?? 'press';
  const name = type === 'x' ? (item.authorName ?? item.sourceName)?.replace(/\.(com|net)$/i, '') : item.sourceName;
  return (
    <div className="prow" onClick={() => onOpen?.(item)}>
      <span className="src-type">{metaFor(type).icon}</span>
      <div>
        <div className="prow-title">{item.titleVi ?? item.title}</div>
        <div className="prow-sub">{name ?? 'Nguồn'} · {relativeTime(item.updatedAt ?? item.publishedAt, now)}</div>
      </div>
    </div>
  );
}

export function Trending({
  items, now, onOpen, showRecent = true,
}: {
  items: FeedItem[];
  now?: Date;
  onOpen?: (item: FeedItem) => void;
  showRecent?: boolean; // mobile tắt "Tin hôm nay" cho gọn
}) {
  // Tin nóng = nóng nhất theo heat; Tin hôm nay = mới nhất theo thời gian.
  const hottest = [...items].sort((a, b) => b.heat - a.heat).slice(0, 5);
  const recent = [...items]
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.publishedAt).getTime() -
        new Date(a.updatedAt ?? a.publishedAt).getTime(),
    )
    .slice(0, 8);
  return (
    <aside className="rail">
      <section className="panel">
        <div className="panel-title">
          🔥 Tin nóng
          <span className="panel-live"><span className="live-dot" /> LIVE</span>
        </div>
        {hottest.map((item) => (
          <Row key={item.clusterId} item={item} now={now} onOpen={onOpen} />
        ))}
      </section>

      {showRecent && (
        <section className="panel">
          <div className="panel-title">🗞️ Tin hôm nay</div>
          {/* Tự cuộn: nhân đôi danh sách để lặp liền mạch */}
          <div className="ticker-view">
            <div className="ticker-track">
              {[...recent, ...recent].map((item, i) => (
                <Row key={`${item.clusterId}-${i}`} item={item} now={now} onOpen={onOpen} />
              ))}
            </div>
          </div>
        </section>
      )}
    </aside>
  );
}
