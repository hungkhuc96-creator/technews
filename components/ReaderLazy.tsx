'use client';

import { useState } from 'react';

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
