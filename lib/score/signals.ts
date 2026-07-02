// Tín hiệu phụ cho công thức độ nóng (P1 audit) — mọi thứ tính từ dữ liệu có sẵn,
// KHÔNG gọi AI.

// Nguồn tier-1: uy tín cao, ít tin đồn — cụm có ≥1 nguồn này được cộng điểm tin cậy.
const TIER1 = new Set([
  'the verge',
  'ars technica',
  'techcrunch',
  'engadget',
  'macrumors',
  '9to5mac',
  '9to5google',
  "tom's hardware",
  'wired',
]);

export function isTier1(sourceName: string): boolean {
  return TIER1.has(sourceName.trim().toLowerCase());
}

// Tin "thuần Mỹ": nhà mạng/ISP/dịch vụ nội địa Mỹ — đúng nhưng vô nghĩa với người
// đọc Việt Nam → giảm điểm (không xóa: vẫn xem được ở tab Mới nhất / tìm kiếm).
const US_ONLY_PATTERNS: RegExp[] = [
  /\bT-?Mobile\b/i,
  /\bVerizon\b/i,
  /\bAT&T\b/i,
  /\bComcast\b/i,
  /\bXfinity\b/i,
  /\bUS Cellular\b/i,
  /\bMint Mobile\b/i,
  /\bCricket Wireless\b/i,
  /\bBoost Mobile\b/i,
  /\bCharter\b.*\bSpectrum\b|\bSpectrum Mobile\b/i,
  /\bDish Network\b/i,
  /\bMedicare\b|\bMedicaid\b/i,
  /\bIRS\b/,
  /\bDMV\b/,
  /\bTSA\b/,
];

export function isUsOnly(title: string): boolean {
  return US_ONLY_PATTERNS.some((re) => re.test(title));
}
