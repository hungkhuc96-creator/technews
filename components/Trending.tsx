import type { FeedItem } from '../lib/feed/getFeed';
import { sourceLabel } from '../lib/feed/format';

export function Trending({ items }: { items: FeedItem[] }) {
  const top = items.slice(0, 5);
  return (
    <aside className="trending">
      <div className="side-title">🔥 ĐANG NÓNG</div>
      {top.map((item, i) => (
        <div className="trend-row" key={item.clusterId}>
          <span className="trend-rank">{i + 1}</span>
          <div>
            <div className="trend-title">{item.title}</div>
            <div className="trend-sub">{sourceLabel(item.nSources)}</div>
          </div>
        </div>
      ))}
    </aside>
  );
}
