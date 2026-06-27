export const CATEGORIES = ['Tất cả', 'AI', 'Điện thoại', 'Laptop', 'Apple', 'Android', 'Game'];

// Khớp chủ đề theo từ khoá trong tiêu đề (phân loại nhẹ phía client).
const CAT_KEYWORDS: Record<string, string[]> = {
  AI: ['ai', 'gpt', 'openai', 'claude', 'llm', 'gemini', 'anthropic', 'mythos', 'fable', 'grok', 'llama', 'deepmind'],
  'Điện thoại': ['iphone', 'phone', 'galaxy', 'pixel', 'smartphone', 'oneplus', 'xiaomi', 'điện thoại'],
  Laptop: ['laptop', 'macbook', 'thinkpad', 'notebook', 'ultrabook', 'legion'],
  Apple: ['apple', 'iphone', 'ipad', 'macbook', 'ios', 'macos', 'siri', 'airpods'],
  Android: ['android', 'pixel', 'samsung', 'galaxy', 'oneplus'],
  Game: ['game', 'gaming', 'steam', 'xbox', 'playstation', 'ps5', 'nintendo', 'gta', 'valve'],
};

// Khớp theo RANH GIỚI TỪ để "ai" không lọt vào "hai", "tài"…
// Ranh giới = đầu/cuối chuỗi hoặc ký tự không phải chữ-số ASCII.
function hasWord(text: string, kw: string): boolean {
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(text);
}

export function matchCategory(title: string, cat: string): boolean {
  if (cat === 'Tất cả') return true;
  const t = title.toLowerCase();
  return (CAT_KEYWORDS[cat] ?? []).some((k) => hasWord(t, k));
}
