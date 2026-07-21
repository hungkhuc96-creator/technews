// Nhận diện khi AI TRẢ LỜI HỘI THOẠI (từ chối / hỏi lại) thay vì dịch — xảy ra khi
// văn bản đưa vào là mẩu cụt/ký hiệu (case thật: tweet chỉ chứa "B8" → Claude đáp
// "Tôi không thể dịch được vì tweet chỉ chứa B8..."). Chuỗi này TUYỆT ĐỐI không được
// lưu làm tiêu đề. Các mẫu đủ đặc trưng để KHÔNG bắt nhầm tiêu đề dịch thật.
const REFUSAL_PATTERNS: RegExp[] = [
  /không thể dịch/i,
  /không thấy (tweet|văn bản|nội dung|câu)/i,
  /sẵn sàng dịch/i,
  /để tôi (có thể )?dịch/i,
  /(một )?câu hoàn chỉnh/i,
  /tweet (này )?(chỉ )?chứa/i,
  /cung cấp (toàn bộ|thêm|đầy đủ|nội dung)/i,
  /bạn có thể (cung cấp|gửi|cho tôi)/i,
];

export function looksLikeRefusal(out: string): boolean {
  return REFUSAL_PATTERNS.some((re) => re.test(out));
}

// Bản dịch AN TOÀN: rỗng hoặc là câu từ chối/hỏi lại của AI → giữ NGUYÊN bản gốc.
export function safeTranslated(out: string | null | undefined, original: string): string {
  const t = (out ?? '').trim();
  if (!t || looksLikeRefusal(t)) return original;
  return t;
}
