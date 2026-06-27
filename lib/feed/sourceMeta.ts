// Nhãn + màu + CTA cho từng loại nguồn (để nhận biết nhanh trong feed & cột phải).
export interface SourceMeta { icon: string; label: string; color: string; cta: string }

export const SOURCE_META: Record<string, SourceMeta> = {
  press: { icon: '📰', label: 'Báo chí', color: '#6f8cff', cta: 'Xem tin' },
  youtube: { icon: '▶', label: 'YouTube', color: '#ff6b6b', cta: 'Xem video' },
  x: { icon: '𝕏', label: 'X', color: '#6fb7ef', cta: 'Xem tin' },
  reddit: { icon: '👽', label: 'Reddit', color: '#ff8a5b', cta: 'Xem tin' },
  tiktok: { icon: '♪', label: 'TikTok', color: '#ff6f9c', cta: 'Xem tin' },
};

export function metaFor(type: string): SourceMeta {
  return SOURCE_META[type] ?? SOURCE_META.press;
}
