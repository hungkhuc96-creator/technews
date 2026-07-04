import { ImageResponse } from 'next/og';

// Ảnh chia sẻ mặc định 1200×630 (Facebook/Zalo/Telegram) — Next tự sinh lúc
// build và tự gắn og:image + twitter:image cho mọi trang không có ảnh riêng
// (trang /tin/ dùng ảnh bài viết). Chỉ dùng chữ ASCII ("peek", "peek.vn") vì
// font mặc định của trình sinh ảnh không chắc có dấu tiếng Việt.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'peek — Feed tin công nghệ';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0B0B0F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36,
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            background: '#E8FF3A',
            borderRadius: '48px 48px 48px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
          }}
        >
          <div style={{ width: 32, height: 17, background: '#0B0B0F', borderRadius: '999px 999px 0 0', marginTop: 22 }} />
          <div style={{ width: 32, height: 17, background: '#0B0B0F', borderRadius: '999px 999px 0 0', marginTop: 22 }} />
        </div>
        <div style={{ display: 'flex', fontSize: 140, fontWeight: 800, color: '#F5F5F0', letterSpacing: '-0.06em' }}>
          peek
        </div>
        <div style={{ display: 'flex', fontSize: 34, color: '#8A8A93' }}>peek.vn</div>
      </div>
    ),
    size,
  );
}
