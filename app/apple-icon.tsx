import { ImageResponse } from 'next/og';

// Icon 180×180 khi ghim peek lên màn hình chính iPhone/iPad — Next tự sinh PNG
// từ JSX lúc build (không cần file ảnh tĩnh).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#E8FF3A',
          borderRadius: 42, // iOS tự bo thêm — nền vàng phủ kín cho chắc
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <div style={{ width: 36, height: 19, background: '#0B0B0F', borderRadius: '999px 999px 0 0', marginTop: 26 }} />
        <div style={{ width: 36, height: 19, background: '#0B0B0F', borderRadius: '999px 999px 0 0', marginTop: 26 }} />
      </div>
    ),
    size,
  );
}
