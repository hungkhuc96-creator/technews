'use client';

import { useState } from 'react';
import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime, sourceLabel, compactNumber } from '../lib/feed/format';
import { metaFor } from '../lib/feed/sourceMeta';

// Lấy video ID từ link YouTube (watch?v= / shorts/ / youtu.be / embed)
function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|\/shorts\/|youtu\.be\/|\/embed\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

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
function YouTubeCard({ item, ts }: { item: FeedItem; ts: string }) {
  const views = item.metrics.views ? `${compactNumber(item.metrics.views)} lượt xem · ` : '';
  const ytId = youtubeId(item.url);
  const [playing, setPlaying] = useState(false);
  return (
    <>
      {playing && ytId ? (
        // Phát TẠI CHỖ — chặn click lan ra thẻ (không mở panel chi tiết).
        <div className="video-embed" onClick={(e) => e.stopPropagation()}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
            title={item.titleVi ?? item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : item.imageUrl && (
        <div
          className="video-thumb"
          onClick={(e) => {
            // Có ID → phát tại chỗ; không có → để thẻ mở chi tiết như cũ.
            if (ytId) {
              e.stopPropagation();
              setPlaying(true);
            }
          }}
        >
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
function PressCard({ item, ts }: { item: FeedItem; ts: string }) {
  const type = item.sourceTypes[0] ?? 'press';
  const hot = item.nSources >= 3;
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
        {hot && <span className="meta-hot">🔥 Nóng</span>}
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
        <PressCard item={item} ts={ts} />
      )}
    </article>
  );
}
