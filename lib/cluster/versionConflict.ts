// Chốt chặn PHIÊN BẢN cho gom cụm: 2 bài nói về hệ điều hành cùng sản phẩm nhưng
// KHÁC số hiệu (macOS 26.6 vs macOS 27) là KHÁC sự kiện — cấm gộp, kể cả khi
// embedding rất giống hoặc AI nhầm là "cùng sự kiện" (case thật 14/7: macOS Tahoe
// 26.6 beta bị gộp với macOS 27 Golden Gate public beta vì tiêu đề cấu trúc giống hệt).
// Luật CỨNG, không gọi mạng/AI → chạy cả khi hết credit.

// Các họ hệ điều hành Apple có đánh số phiên bản năm.
const OS_FAMILIES = ['ipados', 'visionos', 'watchos', 'macos', 'tvos', 'ios'] as const;

// Tên mã macOS → số hiệu major (dữ liệu 2026: Apple đã nhảy sang đánh số theo năm,
// Tahoe = 26, Golden Gate = 27). Bổ sung dần khi có tên mã mới.
const MACOS_CODENAMES: Record<string, number> = {
  'golden gate': 27,
  tahoe: 26,
  sequoia: 15,
  sonoma: 14,
  ventura: 13,
  monterey: 12,
  'big sur': 11,
  catalina: 10,
};

export type VersionSignature = Record<string, number[]>;

// Rút "chữ ký phiên bản" từ tiêu đề: bản đồ sản phẩm → các số hiệu major xuất hiện.
// CHỈ bắt số gắn trực tiếp với tên OS (bỏ giá tiền, số điện thoại, tên chip…).
export function versionSignature(title: string): VersionSignature {
  const t = title.toLowerCase();
  const sig: Record<string, Set<number>> = {};
  const add = (product: string, major: number) => {
    (sig[product] ??= new Set()).add(major);
  };

  // 1) Số hiệu gắn với tên OS: "macos 27", "ipados 27", "macos 26.6" → major 26/27.
  const re = new RegExp(`\\b(${OS_FAMILIES.join('|')})\\s+(\\d{1,2})(?:\\.\\d+)?\\b`, 'g');
  for (const m of t.matchAll(re)) add(m[1], parseInt(m[2], 10));

  // 2) Tên mã macOS → macOS major tương ứng.
  for (const [name, major] of Object.entries(MACOS_CODENAMES)) {
    if (new RegExp(`\\b${name}\\b`).test(t)) add('macos', major);
  }

  const out: VersionSignature = {};
  for (const [k, v] of Object.entries(sig)) out[k] = [...v].sort((a, b) => a - b);
  return out;
}

// True khi 2 tiêu đề mâu thuẫn phiên bản: có ÍT NHẤT một sản phẩm chung mà tập số
// hiệu KHÔNG giao nhau (vd macOS 26 vs macOS 27). Nếu không chung sản phẩm nào, hoặc
// một bên không có số hiệu OS → KHÔNG kết luận mâu thuẫn (để entity/AI xử lý tiếp).
export function versionConflict(a: string, b: string): boolean {
  const sa = versionSignature(a);
  const sb = versionSignature(b);
  for (const product of Object.keys(sa)) {
    const vb = sb[product];
    if (!vb) continue; // sản phẩm chỉ có ở một bên → không xét
    const va = sa[product];
    const shares = va.some((x) => vb.includes(x));
    if (!shares) return true; // cùng sản phẩm, khác hẳn số hiệu → mâu thuẫn
  }
  return false;
}
