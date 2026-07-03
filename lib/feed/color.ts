// Màu avatar suy ra từ tên (ổn định theo tên) — dùng khi nguồn không có logo.
export function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 52% 45%)`;
}
