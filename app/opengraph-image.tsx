import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// Ảnh chia sẻ mặc định 1200×630 — tái tạo ĐÚNG lockup trong bộ nhận diện 4/7
// (file "peek - Logo (standalone).html"), scale 1.6×: bubble 140→224 · gap 32→51
// · wordmark Montserrat 800 64→102px (-0.07em, k kerned -0.035em) · tagline
// Inter 500 21→34px mờ 45%. Font TTF thật (có dấu tiếng Việt) nạp từ app/fonts.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'peek — Liếc phát biết';

// Đọc font từ repo bằng fs (ảnh sinh lúc BUILD nên file luôn có mặt).
// Không dùng fetch(new URL(..., import.meta.url)) — Turbopack chưa hỗ trợ.
const montserrat = readFile(join(process.cwd(), 'app/fonts/Montserrat-ExtraBold.ttf'));
const inter = readFile(join(process.cwd(), 'app/fonts/Inter-Medium.ttf'));

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#0B0B0F',
          backgroundImage: 'radial-gradient(circle at 50% 42%, rgba(232,255,58,0.07), transparent 62%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 51,
        }}
      >
        {/* Bubble: góc trên đều 64, phải-dưới 86, trái-dưới nhọn 3; translateY(14) canh baseline chữ */}
        <div
          style={{
            width: 224,
            height: 224,
            background: '#E8FF3A',
            borderRadius: '64px 64px 86px 3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translateY(14px)',
          }}
        >
          {/* 2 mắt liếc: lệch phải + cao hơn tâm */}
          <div style={{ display: 'flex', gap: 14, transform: 'translate(12px, -13px)' }}>
            <div style={{ width: 43, height: 21.5, background: '#0B0B0F', borderRadius: '999px 999px 0 0' }} />
            <div style={{ width: 43, height: 21.5, background: '#0B0B0F', borderRadius: '999px 999px 0 0' }} />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Montserrat',
            fontWeight: 800,
            fontSize: 102,
            letterSpacing: '-0.07em',
            lineHeight: 1,
            color: '#F5F3EC',
          }}
        >
          pee<span style={{ marginLeft: -4 }}>k</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 500,
            fontSize: 34,
            letterSpacing: '0.01em',
            color: 'rgba(245,243,236,0.45)',
            transform: 'translateY(6px)',
          }}
        >
          Liếc phát biết
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Montserrat', data: await montserrat, weight: 800, style: 'normal' },
        { name: 'Inter', data: await inter, weight: 500, style: 'normal' },
      ],
    },
  );
}
