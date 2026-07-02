import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/db/client';
import { getFeedItem } from '@/lib/feed/getItem';
import { sourceLabel } from '@/lib/feed/format';

// Trang chi tiết 1 tin — để CHIA SẺ (og:tags cho Facebook/Zalo) + SEO (Google
// index từng tin). Cache CDN 5 phút; nội dung tin ít đổi nên đủ tươi.
export const revalidate = 300;

// cache(): generateMetadata + page cùng 1 request chỉ truy vấn DB MỘT lần.
const loadItem = cache(async (id: string) => getFeedItem(createServiceClient(), id));

// Giờ tuyệt đối (múi giờ VN) — trang này bị cache nên không dùng "x giờ trước".
function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit',
    day: 'numeric', month: 'numeric', year: 'numeric',
  });
}

function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|\/shorts\/|youtu\.be\/|\/embed\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const item = await loadItem(id);
  if (!item) return { title: 'Không tìm thấy tin — nóng' };
  const title = item.titleVi ?? item.title;
  const description =
    item.summary ?? (item.text ? `${item.text.slice(0, 160)}…` : 'Tin công nghệ tóm tắt tiếng Việt.');
  return {
    title: `${title} — nóng`,
    description,
    alternates: { canonical: `/tin/${id}` },
    openGraph: {
      title, description, url: `/tin/${id}`, siteName: 'nóng', type: 'article',
      ...(item.imageUrl ? { images: [{ url: item.imageUrl }] } : {}),
    },
    twitter: { card: item.imageUrl ? 'summary_large_image' : 'summary' },
  };
}

export default async function TinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await loadItem(id);
  if (!item) notFound();

  const type = item.sourceTypes[0] ?? 'press';
  const title = item.titleVi ?? item.title;
  const ytId = type === 'youtube' ? youtubeId(item.url) : null;

  return (
    <div className="article-page">
      <header className="article-head">
        <Link href="/" className="logo">nóng<span className="logo-dot" /></Link>
        <Link href="/" className="article-home">← Trang chủ</Link>
      </header>

      <main className="article-main">
        <h1 className="article-title">{title}</h1>
        <div className="article-meta">
          {item.sourceName ?? 'Nguồn'} · {absoluteTime(item.updatedAt ?? item.publishedAt)}
          {type === 'press' && <> · {sourceLabel(item.nSources)}</>}
        </div>

        {ytId ? (
          <div className="reader-ytembed">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="article-banner" src={item.imageUrl} alt="" />
        )}

        {item.summary && (
          <div className="reader-ai">
            <span className="reader-ai-badge">⚡ Tóm tắt bởi AI</span>
            <p className="reader-ai-sum">{item.summary}</p>
          </div>
        )}

        {type === 'press' && item.text && (
          <div className="reader-orig">
            <div className="reader-orig-head">📄 NGUYÊN VĂN (NGUỒN GỐC)</div>
            <p className="reader-orig-para">{item.text}</p>
            <div className="reader-orig-note">
              Trích từ nguồn gốc. Đọc bài đầy đủ qua nút “Mở bài gốc ↗” bên dưới.
            </div>
          </div>
        )}

        {type === 'x' && !item.summary && item.title && (
          <p className="article-tweet">{item.title}</p>
        )}

        <a className="article-src" href={item.url} target="_blank" rel="noopener noreferrer">
          Mở bài gốc trên {item.sourceName ?? 'nguồn phát hành'} ↗
        </a>
        <div className="reader-copyright">
          Hiển thị tóm tắt, trích đoạn và liên kết về bài gốc. Bản quyền thuộc về nguồn phát hành.
        </div>
      </main>
    </div>
  );
}
