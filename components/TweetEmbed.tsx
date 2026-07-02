'use client';

import { Tweet } from 'react-tweet';

// Tweet THẬT qua react-tweet (Vercel): dữ liệu lấy từ CDN syndication công khai
// của CHÍNH X (qua /api/tweet/[id] của mình) — giao diện tweet thật (avatar, tick
// xanh, ảnh, lượt thích), KHÔNG cần đăng nhập, KHÔNG iframe.
// Bối cảnh: mọi instance nitter đã chết/chặn iframe; widget chính thức
// platform.twitter.com render iframe 0px với người chưa đăng nhập (đã thử cả hai).
// Tweet lỗi/bị xóa → rơi về fallback (children).
export function TweetEmbed({ url, children }: { url: string; children: React.ReactNode }) {
  const id = url.match(/\/status\/(\d+)/)?.[1];
  if (!id) return <>{children}</>;
  // react-tweet nhận theme qua class light/dark trên phần tử bao ngoài.
  const dark = typeof document === 'undefined' || document.documentElement.dataset.theme !== 'light';
  return (
    <div className={`tweet-embed ${dark ? 'dark' : 'light'}`}>
      <Tweet
        id={id}
        apiUrl={`/api/tweet/${id}`}
        components={{ TweetNotFound: () => <>{children}</> }}
      />
    </div>
  );
}
