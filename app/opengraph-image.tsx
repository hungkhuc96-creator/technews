import { ImageResponse } from 'next/og';

// Ảnh chia sẻ mặc định 1200×630 (Facebook/Zalo/Telegram) — Next tự sinh lúc
// build và tự gắn og:image + twitter:image cho mọi trang không có ảnh riêng
// (trang /tin/ dùng ảnh bài viết). Bubble theo bộ nhận diện 4/7: góc trên đều,
// phải-dưới to 1.35×, trái-dưới nhọn; mắt lệch phải + cao hơn tâm. Chỉ dùng
// chữ ASCII ("peek", "peek.vn") vì font mặc định không chắc có dấu tiếng Việt.
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
            borderRadius: '46px 46px 62px 2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div style={{ width: 31, height: 16, background: '#0B0B0F', borderRadius: '999px 999px 0 0', transform: 'translate(8px, -8px)' }} />
          <div style={{ width: 31, height: 16, background: '#0B0B0F', borderRadius: '999px 999px 0 0', transform: 'translate(8px, -8px)' }} />
        </div>
        <div style={{ display: 'flex', fontSize: 140, fontWeight: 800, color: '#F5F3EC', letterSpacing: '-0.06em' }}>
          peek
        </div>
        <div style={{ display: 'flex', fontSize: 34, color: 'rgba(245,243,236,0.45)' }}>peek.vn</div>
      </div>
    ),
    size,
  );
}
