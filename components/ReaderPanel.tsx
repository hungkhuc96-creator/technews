'use client';

import { useEffect, useRef, useState } from 'react';
import type { FeedItem } from '../lib/feed/getFeed';
import { relativeTime, sourceLabel } from '../lib/feed/format';

const TYPE_LABEL: Record<string, string> = {
  press: '📰 Bài báo', youtube: '▶ Video', x: '𝕏 Bài đăng', reddit: '👽 Reddit', tiktok: '♪ TikTok',
};

// Màu suy ra từ tên (avatar dự phòng khi nguồn không có logo).
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
  const isVideo = type === 'youtube';
  const isX = type === 'x';
  const showBanner = !!item.imageUrl && type === 'press'; // YouTube dùng player nhúng, không banner
  const ytId = isVideo ? youtubeId(item.url) : null;
  const ts = relativeTime(item.updatedAt ?? item.publishedAt, now);
  const xClean = (item.authorName ?? (item.sourceName ?? '').replace('@', '')).replace(/\.(com|net)$/i, '');
  const srcName = isX ? xClean : (item.sourceName ?? 'Nguồn');
  const nitterUrl = isX ? item.url.replace(/(?:x|twitter)\.com/, 'nitter.net') : '';

  // Tóm tắt AI: báo chí tạo theo yêu cầu (lazy) khi bấm vào — nếu chưa có sẵn.
  const [ai, setAi] = useState<{ summary: string | null; bullets: string[] }>({
    summary: item.summary,
    bullets: item.bullets,
  });
  const needSummary = type === 'press' && !item.summary && item.bullets.length === 0;
  const [loadingAi, setLoadingAi] = useState(needSummary);
  useEffect(() => {
    if (!needSummary) return;
    let alive = true;
    setLoadingAi(true);
    fetch('/api/summary', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clusterId: item.clusterId }),
    })
      .then((r) => r.json())
      .then((d: { summary?: string | null; bullets?: string[] }) => {
        if (!alive) return;
        setAi({ summary: d.summary ?? null, bullets: Array.isArray(d.bullets) ? d.bullets : [] });
        setLoadingAi(false);
      })
      .catch(() => alive && setLoadingAi(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.clusterId]);
  const hasAi = !!ai.summary || ai.bullets.length > 0;

  // Mở panel → đẩy 1 mốc lịch sử. Nút Back / quẹt cạnh trên mobile sẽ POP mốc này
  // (đóng panel) thay vì thoát cả trang. Đóng panel bằng nút thì gọi history.back()
  // để nhả đúng mốc đã đẩy.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    window.history.pushState({ reader: true }, '');
    const onPop = () => closeRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const goBack = () => window.history.back();

  return (
    <div className="reader-overlay" onClick={goBack}>
      <div className="reader-panel" onClick={(e) => e.stopPropagation()}>
        <div className="reader-bar">
          <button className="reader-back" onClick={goBack}>← Quay lại</button>
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
              <>
                {/* Box "Dịch bởi AI" — caption đã dịch sẵn lúc nạp (cùng kiểu box báo) */}
                <div className="reader-ai">
                  <span className="reader-ai-badge">⚡ Dịch bởi AI</span>
                  <p className="reader-ai-sum">{item.title}</p>
                </div>
                <div className="reader-srcs-title">🖥 TRANG GỐC</div>
                <div className="reader-nitter">
                  <iframe src={nitterUrl} title="Nitter — bài gốc trên X" loading="lazy" />
                </div>
              </>
            )}

            {loadingAi ? (
              <div className="reader-ai">
                <span className="reader-ai-badge">⚡ Đang tóm tắt…</span>
                <p className="reader-ai-sum reader-ai-loading">AI đang đọc bài và tóm tắt sang tiếng Việt…</p>
              </div>
            ) : hasAi ? (
              <div className="reader-ai">
                <span className="reader-ai-badge">⚡ Tóm tắt bởi AI</span>
                {ai.summary && <p className="reader-ai-sum">{ai.summary}</p>}
                {ai.bullets.length > 0 && (
                  <div className="reader-ai-bullets">
                    {ai.bullets.map((b, i) => (
                      <div key={i} className="reader-ai-bullet"><span className="r-dot" /><span>{b}</span></div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

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
