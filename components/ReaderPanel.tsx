import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime, sourceLabel, compactNumber } from '../lib/feed/format';

const TYPE_LABEL: Record<string, string> = {
  press: '📰 Bài báo', youtube: '▶ Video', x: '𝕏 Bài đăng', reddit: '👽 Reddit', tiktok: '♪ TikTok',
};

function hashColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 52% 45%)`;
}

// Lấy video ID từ link YouTube (watch?v= / shorts/ / youtu.be / embed)
function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|\/shorts\/|youtu\.be\/|\/embed\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

// Panel chi tiết trượt từ phải khi bấm một thẻ — bám sát thiết kế gốc.
export function ReaderPanel({ item, now, onClose }: { item: FeedItem; now?: Date; onClose: () => void }) {
  const type = item.sourceTypes[0] ?? 'press';
  const title = item.titleVi ?? item.title;
  const hot = item.nSources >= 3;
  const hasAi = !!item.summary || item.bullets.length > 0;
  const isVideo = type === 'youtube';
  const isX = type === 'x';
  const showBanner = !!item.imageUrl && type === 'press'; // YouTube dùng player nhúng, không banner
  const ytId = isVideo ? youtubeId(item.url) : null;
  const ts = relativeTime(item.updatedAt ?? item.publishedAt, now);
  const m = item.metrics;
  const xClean = (item.authorName ?? (item.sourceName ?? '').replace('@', '')).replace(/\.(com|net)$/i, '');
  const srcName = isX ? xClean : (item.sourceName ?? 'Nguồn');

  return (
    <div className="reader-overlay" onClick={onClose}>
      <div className="reader-panel" onClick={(e) => e.stopPropagation()}>
        <div className="reader-bar">
          <button className="reader-back" onClick={onClose}>← Quay lại</button>
          <span className="reader-type">{TYPE_LABEL[type] ?? TYPE_LABEL.press}</span>
          <span className="reader-live"><span className="live-dot" /> CẬP NHẬT</span>
        </div>

        <div className="reader-scroll">
          {showBanner && (
            <div className="reader-banner" style={{ backgroundImage: `url(${item.imageUrl})` }}>
              <div className="reader-banner-grad" />
              <div className="reader-badges">
                {hot && <span className="reader-hot"><span className="live-dot" /> 🔥 ĐANG NÓNG</span>}
                {isVideo && <span className="reader-ytbadge">▶ YouTube</span>}
              </div>
            </div>
          )}

          <div className="reader-body">
            {/* X: bỏ tiêu đề (caption) vì box X bên dưới đã có; chỉ giữ giờ + số nguồn */}
            {!isX && <h1 className="reader-h1">{title}</h1>}

            <div className="reader-meta">
              {item.sources.length > 0 && (
                <span className="reader-avatars">
                  {item.sources.map((a, i) => (
                    a.logo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img key={i} className="r-avatar r-logo" src={a.logo} alt="" />
                      : <span key={i} className="r-avatar" style={{ background: a.color }}>{a.initial}</span>
                  ))}
                </span>
              )}
              <span className="reader-metatext">{ts} · {sourceLabel(item.nSources)}</span>
            </div>

            {isVideo && (ytId ? (
              <div className="reader-ytembed">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : item.imageUrl && (
              <a className="reader-video" href={item.url} target="_blank" rel="noopener noreferrer"
                style={{ backgroundImage: `url(${item.imageUrl})` }}>
                <span className="reader-ytbadge tl">▶ YouTube</span>
                <span className="reader-play">▶</span>
              </a>
            ))}

            {isX && (
              <div className="reader-box">
                <div className="reader-xhead">
                  <span className="r-avatar xbig" style={{ background: hashColor(xClean) }}>{xClean.charAt(0).toUpperCase()}</span>
                  <div className="reader-xinfo">
                    <div className="reader-xname">{xClean} <span className="x-verified">✔</span></div>
                    <div className="reader-xhandle">{item.sourceName} · X</div>
                  </div>
                  <span className="reader-xlogo">𝕏</span>
                </div>
                <p className="reader-xtweet">{item.title}</p>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="reader-xmedia" src={item.imageUrl} alt="" />
                )}
                <div className="reader-xeng">
                  {m.likes ? <span>♥ {compactNumber(m.likes)}</span> : null}
                  {m.reposts ? <span>⇄ {compactNumber(m.reposts)}</span> : null}
                  {m.comments ? <span>💬 {compactNumber(m.comments)}</span> : null}
                  {m.views ? <span>👁 {compactNumber(m.views)}</span> : null}
                </div>
              </div>
            )}

            {hasAi && (
              <div className="reader-ai">
                <span className="reader-ai-badge">⚡ Tóm tắt bởi AI</span>
                {item.summary && <p className="reader-ai-sum">{item.summary}</p>}
                {item.bullets.length > 0 && (
                  <div className="reader-ai-bullets">
                    {item.bullets.map((b, i) => (
                      <div key={i} className="reader-ai-bullet"><span className="r-dot" /><span>{b}</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {type === 'press' && item.text && (
              <div className="reader-orig">
                <div className="reader-orig-head">📄 NGUYÊN VĂN (NGUỒN GỐC)</div>
                <p className="reader-orig-para">{item.text}</p>
                <div className="reader-orig-note">Trích từ nguồn gốc. Đọc bài đầy đủ qua nút “Mở bài gốc ↗” bên dưới.</div>
              </div>
            )}

            <div className="reader-srcs-title">NGUỒN ĐƯA TIN · {sourceLabel(item.nSources)}</div>
            <a className="reader-srcrow" href={item.url} target="_blank" rel="noopener noreferrer">
              {item.sources[0]?.logo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img className="r-avatar r-logo" src={item.sources[0].logo} alt="" />
                : <span className="r-avatar" style={{ background: hashColor(srcName) }}>{srcName.charAt(0).toUpperCase()}</span>}
              <div className="reader-srcrow-info">
                <div className="reader-srcrow-name">{srcName}</div>
                <div className="reader-srcrow-time">{ts}</div>
              </div>
              <span className="reader-srcrow-open">Mở bài gốc ↗</span>
            </a>
            <div className="reader-copyright">
              Hiển thị tóm tắt, trích đoạn và liên kết về bài gốc. Bản quyền thuộc về nguồn phát hành.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
