'use client';

import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime, sourceLabel, compactNumber } from '../lib/feed/format';
import { metaFor } from '../lib/feed/sourceMeta';

// Icon loại nguồn — DÙNG ĐÚNG bộ icon ở "Lọc nguồn" cột trái (📰 ▶ 𝕏 👽 ♪).
function SrcLogo({ item }: { item: FeedItem }) {
  const type = item.sourceTypes[0] ?? 'press';
  return <span className="src-type">{metaFor(type).icon}</span>;
}

function See({ type }: { type: string }) {
  return <span className="see">{metaFor(type).cta} →</span>;
}

// Tiêu đề là LINK THẬT tới /tin/[id] (Google crawl được, Cmd/Ctrl+click mở tab mới).
// Click thường vẫn để thẻ mở panel đọc nhanh như cũ.
function TitleLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <a
      href={`/tin/${id}`}
      className="title-link"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) { e.stopPropagation(); return; } // mở tab mới
        e.preventDefault(); // click thường → card mở panel
      }}
    >
      {children}
    </a>
  );
}

// Tên tài khoản X gọn (bỏ đuôi .com nếu trùng trang báo)
function xName(item: FeedItem): string {
  const n = item.authorName ?? (item.sourceName ?? '').replace('@', '');
  return n.replace(/\.(com|net)$/i, '');
}

// ===== Thẻ X =====
function XCard({ item, ts }: { item: FeedItem; ts: string }) {
  const m = item.metrics;
  return (
    <>
      <div className="card-meta">
        <SrcLogo item={item} />
        <span className="x-name">{xName(item)}</span>
        <span>· {ts}</span>
      </div>
      <p className="x-tweet">{item.title}</p>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="x-media" src={item.imageUrl} alt="" loading="lazy" />
      )}
      <div className="card-foot">
        <span className="foot-info x-eng">
          {m.likes ? <span>♥ {compactNumber(m.likes)}</span> : null}
          {m.reposts ? <span>⇄ {compactNumber(m.reposts)}</span> : null}
          {m.comments ? <span>💬 {compactNumber(m.comments)}</span> : null}
          {m.views ? <span>👁 {compactNumber(m.views)}</span> : null}
        </span>
        <See type="x" />
      </div>
    </>
  );
}

// ===== Thẻ YouTube =====
// KHÔNG phát tại chỗ trên feed — bấm thẻ mở panel bài, video xem trong đó.
function YouTubeCard({ item, ts }: { item: FeedItem; ts: string }) {
  const views = item.metrics.views ? `${compactNumber(item.metrics.views)} lượt xem · ` : '';
  return (
    <>
      {item.imageUrl && (
        <div className="video-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="card-thumb"
            src={item.imageUrl}
            alt=""
            loading="lazy"
            onError={(e) => {
              // Video không có bản maxres → lùi về hqdefault (luôn tồn tại).
              const img = e.currentTarget;
              if (img.src.includes('maxresdefault')) {
                img.src = img.src.replace('maxresdefault', 'hqdefault');
              }
            }}
          />
          <span className="video-play">▶</span>
        </div>
      )}
      <div className="card-meta">
        <SrcLogo item={item} />
        <span>{item.sourceName ?? 'YouTube'}</span>
        <span>· {views}{ts}</span>
      </div>
      <h3 className="card-title"><TitleLink id={item.clusterId}>{item.titleVi ?? item.title}</TitleLink></h3>
      {item.summary && <p className="card-summary">{item.summary}</p>}
      <div className="card-foot"><See type="youtube" /></div>
    </>
  );
}

// ===== Thẻ báo chí (mặc định) =====
function PressCard({ item, ts, now }: { item: FeedItem; ts: string; now?: Date }) {
  const type = item.sourceTypes[0] ?? 'press';
  const hot = item.nSources >= 3;
  // "Vừa cập nhật": có bài mới trong 2h và không phải tin 1 nguồn lẻ loi.
  const updatedMs = new Date(item.updatedAt ?? item.publishedAt).getTime();
  const fresh = item.nSources >= 2 && (now ?? new Date()).getTime() - updatedMs < 2 * 3600 * 1000;
  return (
    <>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="card-thumb" src={item.imageUrl} alt="" loading="lazy" />
      )}
      <div className="card-meta">
        <SrcLogo item={item} />
        <span>{item.sourceName ?? 'Nguồn'}</span>
        <span>· {ts}</span>
        {/* LÝ DO hot — 1 badge duy nhất, ưu tiên: đang lên nhanh > nóng > vừa cập nhật */}
        {item.rising ? (
          <span className="meta-rising">📈 Đang lên nhanh</span>
        ) : hot ? (
          <span className="meta-hot">🔥 Nóng</span>
        ) : fresh ? (
          <span className="meta-fresh">⚡ Vừa cập nhật</span>
        ) : null}
      </div>
      <h3 className="card-title"><TitleLink id={item.clusterId}>{item.titleVi ?? item.title}</TitleLink></h3>
      {item.summary ? (
        <p className="card-summary">{item.summary}</p>
      ) : item.bullets.length > 0 ? (
        <ul className="card-bullets">
          {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      ) : null}
      <div className="card-foot">
        <span className="foot-info">
          {item.sources.length > 0 && (
            <span className="mini-avatars">
              {item.sources.map((a, i) => (
                a.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} className="mini-avatar mini-logo" src={a.logo} alt="" loading="lazy" />
                ) : (
                  <span key={i} className="mini-avatar" style={{ background: a.color }}>{a.initial}</span>
                )
              ))}
            </span>
          )}
          <span>{sourceLabel(item.nSources)}</span>
        </span>
        <See type={type} />
      </div>
    </>
  );
}

export function FeedCard({ item, now, onOpen }: { item: FeedItem; now?: Date; onOpen?: () => void }) {
  const type = item.sourceTypes[0] ?? 'press';
  const ts = relativeTime(item.updatedAt ?? item.publishedAt, now);
  return (
    <article className="card" onClick={onOpen}>
      {type === 'x' ? (
        <XCard item={item} ts={ts} />
      ) : type === 'youtube' ? (
        <YouTubeCard item={item} ts={ts} />
      ) : (
        <PressCard item={item} ts={ts} now={now} />
      )}
    </article>
  );
}
