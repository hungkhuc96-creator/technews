export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const day = Math.floor(hour / 24);
  return `${day} ngày trước`;
}

export function sourceLabel(nSources: number): string {
  return nSources <= 1 ? '1 nguồn' : `${nSources} nguồn đưa tin`;
}

// 3400 → "3,4k" · 1.200.000 → "1,2M" (rút gọn số tương tác/lượt xem).
export function compactNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '').replace('.', ',') + 'k';
  return String(n);
}
