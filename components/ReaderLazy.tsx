'use client';

import { useEffect, useState } from 'react';

// Các mục tóm tắt "bấm mới tạo" (lazy) cho trang chia sẻ /tin/[id] — hành vi y hệt
// ReaderPanel, dùng chung API /api/detail và /api/video-summary, cache ở server.

export function DetailSummary({ clusterId }: { clusterId: string }) {
  const [detail, setDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (loading || detail) return;
    setLoading(true);
    try {
      const r = await fetch('/api/detail', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clusterId }),
      });
      const d = (await r.json()) as { detail?: string | null };
      setDetail(d.detail ?? null);
    } catch {
      /* lỗi mạng — bấm lại sẽ thử lại */
    } finally {
      setLoading(false);
    }
  };
  if (detail) {
    return (
      <div className="reader-ai reader-detail">
        <span className="reader-ai-badge">📖 Tóm tắt chi tiết</span>
        {detail.split(/\n+/).map((para, i) => (
          <p key={i} className="reader-ai-sum">{para}</p>
        ))}
      </div>
    );
  }
  return (
    <button className="detail-btn" onClick={load} disabled={loading}>
      {loading ? '⚡ Đang viết bản chi tiết…' : '📖 Đọc tóm tắt chi tiết'}
    </button>
  );
}

export function VideoSummary({ postId, initial }: { postId: string; initial: string | null }) {
  const [sum, setSum] = useState<string | null>(initial);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (loading || sum) return;
    setLoading(true);
    try {
      const r = await fetch('/api/video-summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const d = (await r.json()) as { summary?: string | null };
      setSum(d.summary ?? null);
    } catch {
      /* lỗi mạng — bấm lại sẽ thử lại */
    } finally {
      setLoading(false);
    }
  };
  if (sum) {
    return (
      <div className="reader-ai reader-detail">
        <span className="reader-ai-badge">📖 Ý chính video</span>
        <ul className="card-bullets">
          {sum.split(/\n+/).map((line, i) => {
            const t = line.replace(/^-\s*/, '').trim();
            return t ? <li key={i}>{t}</li> : null;
          })}
        </ul>
      </div>
    );
  }
  return (
    <button className="detail-btn" onClick={load} disabled={loading}>
      {loading ? '⚡ AI đang xem video… (có thể mất ~30 giây)' : '📖 Xem ý chính video'}
    </button>
  );
}

// "Cộng đồng nói gì" (HN/Reddit): TỰ tải khi mở bài — có cache thì hiện ngay,
// chưa có thì AI đọc bình luận (~5-8s). Không lấy được (Reddit chặn IP...) thì
// hiện ghi chú nhẹ nhàng thay vì box trống.
export function DiscussionSummary({ postId }: { postId: string }) {
  const [sum, setSum] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'done'>('loading');
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/discussion-summary', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ postId }),
        });
        const d = (await r.json()) as { summary?: string | null };
        if (alive) setSum(d.summary ?? null);
      } catch {
        /* lỗi mạng — lần mở sau thử lại */
      } finally {
        if (alive) setState('done');
      }
    })();
    return () => { alive = false; };
  }, [postId]);

  if (state === 'loading') {
    return (
      <div className="reader-ai reader-detail">
        <span className="reader-ai-badge">💬 Cộng đồng nói gì</span>
        <p className="reader-ai-sum">⚡ Đang đọc thảo luận…</p>
      </div>
    );
  }
  if (!sum) {
    return (
      <div className="reader-ai reader-detail">
        <span className="reader-ai-badge">💬 Cộng đồng nói gì</span>
        <p className="reader-ai-sum">Chưa lấy được thảo luận lúc này — mở lại bài sau ít phút nhé.</p>
      </div>
    );
  }
  const lines = sum.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const intro = lines.filter((l) => !l.startsWith('-'));
  const bullets = lines.filter((l) => l.startsWith('-')).map((l) => l.replace(/^-\s*/, ''));
  return (
    <div className="reader-ai reader-detail">
      <span className="reader-ai-badge">💬 Cộng đồng nói gì</span>
      {intro.map((para, i) => <p key={i} className="reader-ai-sum">{para}</p>)}
      {bullets.length > 0 && (
        <ul className="card-bullets">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}
    </div>
  );
}
