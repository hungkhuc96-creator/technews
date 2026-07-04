import { ImageResponse } from 'next/og';

// Icon 180×180 khi ghim peek lên màn hình chính iPhone/iPad — Next tự sinh PNG
// từ JSX lúc build (không cần file ảnh tĩnh). iOS tự bo góc nên nền vàng phủ kín;
// chỉ thể hiện 2 mắt liếc (lệch phải + cao hơn tâm) theo bộ nhận diện 4/7.
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <div style={{ width: 35, height: 18, background: '#0B0B0F', borderRadius: '999px 999px 0 0', transform: 'translate(9px, -9px)' }} />
        <div style={{ width: 35, height: 18, background: '#0B0B0F', borderRadius: '999px 999px 0 0', transform: 'translate(9px, -9px)' }} />
      </div>
    ),
    size,
  );
}
