// Nhãn + màu + CTA cho từng loại nguồn (để nhận biết nhanh trong feed & cột phải).
export interface SourceMeta { icon: string; label: string; color: string; cta: string }

export const SOURCE_META: Record<string, SourceMeta> = {
  press: { icon: '📰', label: 'Báo', color: '#2563eb', cta: 'Xem tin' },
  youtube: { icon: '▶', label: 'YouTube', color: '#ef4444', cta: 'Xem video' },
  x: { icon: '𝕏', label: 'X', color: '#1d9bf0', cta: 'Xem tin' },
  reddit: { icon: '👽', label: 'Reddit', color: '#ff4500', cta: 'Xem tin' },
  tiktok: { icon: '♪', label: 'TikTok', color: '#ff0050', cta: 'Xem tin' },
};

export function metaFor(type: string): SourceMeta {
  return SOURCE_META[type] ?? SOURCE_META.press;
}
