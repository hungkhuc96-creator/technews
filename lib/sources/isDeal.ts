// Nhận diện tin giảm giá / khuyến mãi (Prime Day, Black Friday, sale...) để LỌC BỎ
// — deals nước ngoài không liên quan người dùng Việt.
const DEAL_PATTERNS: RegExp[] = [
  /prime day/i,
  /black friday/i,
  /cyber monday/i,
  /\bdeals\b/i, // "deals" số nhiều (thường là khuyến mãi); tránh "deal" số ít (thương vụ)
  /\bsale\b/i,
  // "sales" số nhiều CHỈ chặn trong ngữ cảnh mua sắm/ngày lễ — không chặn trần
  // vì "sales" còn là DOANH SỐ trong tin thật ("Tesla sales jump", "PS5 sales slow").
  // cho phép vài chữ đệm: "Fourth of July MATTRESS Sales", "July 4th TECH sales"
  /(fourth of july|july 4(th)?|labor day|memorial day|holiday|back[- ]to[- ]school)\b.{0,30}\bsales?\b/i,
  /\bsales:\s/i,           // "Fourth of July Sales: Save on..." (tít listicle)
  /one[- ]time purchase/i, // gói mua trọn đời kiểu Macworld/StackSocial (từng lọt: AdGuard)
  /promo codes?/i,         // "Altra Running Promo Codes July 2026" (Wired đăng cả trang mã giảm giá)
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

// Chuyên mục NGOÀI CÔNG NGHỆ / dạng bài không phải tin — lọc theo nhãn
// <category> trong RSS (Wired gắn nhãn rất sạch: "Science / Health",
// "Gear / Deals"...). Case thật 4/7: feed tổng của Wired nhét tin sức khoẻ,
// nệm sale, hoá thạch vào top "Tin nóng" vì hôm lễ không có tin mới đè xuống.
const OFF_TOPIC_CATEGORIES: RegExp[] = [
  /^science\b/i,          // sức khoẻ, môi trường, hoá thạch...
  /^culture\b/i,
  /^politics\b/i,
  /\bdeals\b/i,           // "Gear / Deals"
  /buying guides?/i,      // bài "Best X 2026" — listicle mua sắm, không phải tin
  /how to and advice/i,   // bài hướng dẫn, không phải tin
];

export function isOffTopic(categories: string[]): boolean {
  return categories.some((c) => OFF_TOPIC_CATEGORIES.some((re) => re.test(c)));
}

// Bộ lọc "rác" tổng cho ingest báo chí: deal + đố vui + chuyên mục ngoài công nghệ.
export function isNoise(title: string, categories: string[] = []): boolean {
  return (
    isDeal(title) ||
    PUZZLE_PATTERNS.some((re) => re.test(title)) ||
    isOffTopic(categories)
  );
}
