// Nhận diện tin giảm giá / khuyến mãi (Prime Day, Black Friday, sale...) để LỌC BỎ
// — deals nước ngoài không liên quan người dùng Việt.
const DEAL_PATTERNS: RegExp[] = [
  /prime day/i,
  /black friday/i,
  /cyber monday/i,
  /\bdeals\b/i, // "deals" số nhiều (thường là khuyến mãi); tránh "deal" số ít (thương vụ)
  /\bsale\b/i,
  /\bdiscounts?\b/i,
  /\bcoupons?\b/i,
  /save up to/i,
  /save \$\d/i,
  /\d+% off/i,
  /price drops?/i,
  /lowest price/i,
  /half[- ]price/i,
  /on sale/i,
  // Các mẫu deal từng LỌT LƯỚI (thấy thật trên feed):
  /prime pick/i,               // "Prime pick: Samsung Galaxy Watch 8..."
  /record[- ]low/i,            // "...still at a record-low price"
  /drops? to (a )?new low/i,   // "...drops to a new low of $229.99"
  /hits? a fresh low/i,        // "...just hit a fresh low at Amazon"
  /\bdeal:/i,                  // "Samsung flagship deal: ..."
];

// Đố vui / game hằng ngày (Wordle, NYT Connections...) — không phải tin công nghệ.
// CNET đăng ~5 bài/ngày loại này, từng tạo "cụm rác" 29 bài trên feed.
const PUZZLE_PATTERNS: RegExp[] = [
  /\bwordle\b/i,
  /\bcrossword\b/i,
  /nyt (connections|strands|mini)/i,
  /connections:? sports edition/i,
  /\bstrands\b.*(hints?|answers?)/i,
  /(hints?( and| ,)? answers?|answers? and help)/i, // "Hints, Answer and Help for..."
];

export function isDeal(title: string): boolean {
  return DEAL_PATTERNS.some((re) => re.test(title));
}

// Bộ lọc "rác" tổng cho ingest báo chí: deal + đố vui.
export function isNoise(title: string): boolean {
  return isDeal(title) || PUZZLE_PATTERNS.some((re) => re.test(title));
}
