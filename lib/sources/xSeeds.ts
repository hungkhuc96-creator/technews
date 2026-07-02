// Handle X theo spec §12.4 — ĐỦ các handle bạn cung cấp + nhóm CEO/hãng chọn lọc.
// Chi phí Apify KHÔNG tăng theo số handle: ingestX gộp tất cả vào 1 query duy nhất
// và chặn trần bằng maxItems (40/lần chạy) — thêm handle chỉ mở rộng độ phủ.
export const X_HANDLES: string[] = [
  // Bạn cung cấp — reviewer + báo
  'MKBHD', 'verge', 'TechCrunch', 'engadget', 'arstechnica', 'CNET',
  'MacRumors', '9to5mac', '9to5Google', 'GSMArena', 'androidauth',
  // Bạn cung cấp — leaker
  'evleaks', 'UniverseIce', 'Tom_Warren', 'markgurman', 'rolandquandt',
  // Bổ sung — CEO / lãnh đạo hãng
  'sundarpichai', 'tim_cook', 'sama', 'elonmusk',
  // Bổ sung — hãng / tổ chức
  'OpenAI', 'nvidia', 'AnthropicAI',
];
