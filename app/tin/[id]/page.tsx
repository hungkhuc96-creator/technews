import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/db/client';
import { getFeedItem } from '@/lib/feed/getItem';
import { sourceLabel } from '@/lib/feed/format';
import { DetailSummary, DiscussionSummary, VideoSummary } from '@/components/ReaderLazy';
import { Logo } from '@/components/Logo';
import { youtubeId } from '@/lib/feed/youtube';
import { articleJsonLd } from '@/lib/seo/jsonld';

// Trang chi tiết 1 tin — để CHIA SẺ (og:tags cho Facebook/Zalo) + SEO (Google
// index từng tin). Cache CDN 1 giờ; nội dung tin ít đổi nên đủ tươi.
export const revalidate = 3600;
// Route động cần generateStaticParams (dù rỗng) để Next bật cache ISR — thiếu nó
// trang bị render lại MỖI lượt xem (đo thật: TTFB 1,3s thay vì 0,17s như trang chủ).
export function generateStaticParams(): { id: string }[] {
  return [];
}

// cache(): generateMetadata + page cùng 1 request chỉ truy vấn DB MỘT lần.
const loadItem = cache(async (id: string) => getFeedItem(createServiceClient(), id));

// Giờ tuyệt đối (múi giờ VN) — trang này bị cache nên không dùng "x giờ trước".
function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit',
    day: 'numeric', month: 'numeric', year: 'numeric',
  });
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const item = await loadItem(id);
  if (!item) return { title: 'Không tìm thấy tin — peek' };
  const title = item.titleVi ?? item.title;
  const description =
    item.summary ?? (item.text ? `${item.text.slice(0, 160)}…` : 'Tin công nghệ tóm tắt tiếng Việt.');
  return {
    title: `${title} — peek`,
    description,
    alternates: { canonical: `/tin/${id}` },
    openGraph: {
      title, description, url: `/tin/${id}`, siteName: 'peek', type: 'article',
      publishedTime: item.publishedAt,
      modifiedTime: item.updatedAt ?? item.publishedAt,
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
      {/* JSON-LD (NewsArticle + Breadcrumb) — vé vào Google News/Top Stories */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(item)) }}
      />
      <header className="article-head">
        <Link href="/" className="logo-link"><Logo /></Link>
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
          <img className="article-banner" src={item.imageUrl} alt={title} />
        )}

        {item.summary && (
          <div className="reader-ai reader-detail">
            <span className="reader-ai-badge">📖 Ý chính đáng đọc</span>
            <p className="reader-ai-sum">{item.summary}</p>
          </div>
        )}

        {/* Ý chính video (YouTube): hiện ngay nếu đã tóm tắt sẵn, chưa thì bấm mới tạo */}
        {type === 'youtube' && (
          <VideoSummary postId={item.clusterId} initial={item.videoSummary} />
        )}

        {/* Tóm tắt chi tiết (báo chí): bấm mới tạo, cache ở server */}
        {type === 'press' && <DetailSummary clusterId={item.clusterId} />}

        {/* HN/Reddit: AI đọc bình luận cộng đồng và tóm tắt (tự tải, cache server) */}
        {(type === 'hn' || type === 'reddit') && <DiscussionSummary postId={item.clusterId} />}

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
