// Handle X = TIẾNG NÓI CÁ NHÂN (CEO, leaker, reviewer, hãng) — KHÔNG lấy tài khoản
// báo chí nữa: tweet của báo chỉ là link bài báo, đã trùng hoàn toàn với mục "Báo".
// Giá trị riêng của X là góc nhìn/rò rỉ mà báo không có.
//
// Chi phí Apify KHÔNG tăng theo số handle: ingestX gộp tất cả vào 1 query và chặn
// trần bằng maxItems (40/lần) — thêm handle chỉ mở rộng độ phủ, không tốn thêm.
export const X_HANDLES: string[] = [
  // CEO / lãnh đạo hãng công nghệ
  'elonmusk', 'sama', 'sundarpichai', 'tim_cook', 'satyanadella',
  'AravSrinivas', 'karpathy', 'demishassabis',
  // Leaker / nhà báo mảng công nghệ (rò rỉ, tin nội bộ)
  'evleaks', 'Tom_Warren', 'markgurman', 'rolandquandt', 'mingchikuo',
  // Reviewer / YouTuber công nghệ (phone + laptop)
  'MKBHD', 'Dave2D', 'UrAvgConsumer',
  'Mrwhosetheboss',   // Arun Maini — phone, kênh review phone lớn nhất YouTube
  'LinusTech',        // Linus Sebastian (Linus Tech Tips) — laptop/PC
  'austinnotduncan',  // Austin Evans — phone/laptop
  'ijustine',         // iJustine — Apple/phone
  'SuperSaf',         // SuperSaf — camera phone
  'theMrMobile',      // Michael Fisher (MrMobile) — phone
  'Flossy_Carter',    // Flossy Carter — phone
  'HardwareCanucks',  // Hardware Canucks — laptop/PC
  'DannyWinget',      // Danny Winget — phone/laptop
  // Hãng / phòng thí nghiệm AI
  'OpenAI', 'AnthropicAI', 'nvidia', 'Google', 'GoogleDeepMind',
  'xai', 'perplexity_ai', 'Microsoft', 'Tesla',
];
