const STOPWORDS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'new', 'best', 'how', 'why',
  'what', 'when', 'where', 'your', 'our', 'my', 'we', 'it', 'is', 'are', 'to', 'of',
  'for', 'and', 'or', 'with', 'will', 'can', 'now', 'first', 'top', 'here',
]);

// Lấy "thực thể": token có chữ HOA hoặc có CHỮ SỐ (tên riêng/sản phẩm như
// OpenAI, GPT-5.2, iPhone, RTX). Bỏ số trần ("17") và từ thường viết hoa đầu câu.
export function extractEntities(title: string): string[] {
  const tokens = title.match(/[A-Za-z0-9][A-Za-z0-9.+-]*/g) ?? [];
  const out = new Set<string>();
  for (const t of tokens) {
    const hasLetter = /[A-Za-z]/.test(t);
    const hasUpper = /[A-Z]/.test(t);
    const hasDigit = /\d/.test(t);
    if (!hasLetter) continue; // bỏ số trần
    if (!hasUpper && !hasDigit) continue; // bỏ từ thường
    const norm = t.toLowerCase();
    if (norm.length < 2) continue;
    if (STOPWORDS.has(norm)) continue;
    out.add(norm);
  }
  return [...out];
}
