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
];

export function isDeal(title: string): boolean {
  return DEAL_PATTERNS.some((re) => re.test(title));
}
