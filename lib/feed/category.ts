export const CATEGORIES = [
  'Tất cả', 'AI', 'Điện thoại', 'Laptop', 'Chip', 'Apple', 'Android', 'Game',
  'Bảo mật', 'Xe điện', 'Mạng XH', 'Tai nghe', 'Đồng hồ', 'VR/AR', 'Camera',
];

// Khớp chủ đề theo từ khoá trong tiêu đề (phân loại nhẹ phía client). Gồm cả từ
// tiếng Anh (tiêu đề gốc) lẫn tiếng Việt (tiêu đề đã dịch).
const CAT_KEYWORDS: Record<string, string[]> = {
  AI: ['ai', 'gpt', 'openai', 'claude', 'llm', 'gemini', 'anthropic', 'mythos', 'fable', 'grok', 'llama', 'deepmind', 'chatbot', 'copilot', 'trí tuệ nhân tạo'],
  'Điện thoại': ['iphone', 'phone', 'galaxy', 'pixel', 'smartphone', 'oneplus', 'xiaomi', 'oppo', 'vivo', 'realme', 'foldable', 'điện thoại'],
  Laptop: ['laptop', 'macbook', 'thinkpad', 'notebook', 'ultrabook', 'legion', 'xps', 'surface', 'chromebook', 'zenbook'],
  Chip: ['chip', 'cpu', 'gpu', 'nvidia', 'amd', 'intel', 'snapdragon', 'processor', 'silicon', 'ryzen', 'rtx', 'tsmc', 'semiconductor', 'exynos', 'mediatek', 'bán dẫn'],
  Apple: ['apple', 'iphone', 'ipad', 'macbook', 'ios', 'macos', 'siri', 'airpods', 'vision pro', 'apple watch'],
  Android: ['android', 'pixel', 'samsung', 'galaxy', 'oneplus', 'xiaomi'],
  Game: ['game', 'gaming', 'steam', 'xbox', 'playstation', 'ps5', 'nintendo', 'switch', 'gta', 'valve', 'console', 'epic games'],
  'Bảo mật': ['security', 'hack', 'hacked', 'breach', 'vulnerability', 'malware', 'ransomware', 'phishing', 'privacy', 'exploit', 'spyware', 'bảo mật', 'lừa đảo', 'rò rỉ'],
  'Xe điện': ['tesla', 'rivian', 'lucid', 'byd', 'electric vehicle', 'electric car', 'ev', 'waymo', 'self-driving', 'autonomous', 'cybertruck', 'xe điện', 'xe tự lái'],
  'Mạng XH': ['meta', 'facebook', 'instagram', 'tiktok', 'threads', 'whatsapp', 'snapchat', 'twitter', 'mạng xã hội'],
  'Tai nghe': ['headphone', 'headphones', 'earbuds', 'airpods', 'headset', 'bose', 'soundbar', 'speaker', 'âm thanh', 'tai nghe', 'loa'],
  'Đồng hồ': ['smartwatch', 'apple watch', 'galaxy watch', 'pixel watch', 'wearable', 'fitbit', 'garmin', 'whoop', 'đồng hồ thông minh'],
  'VR/AR': ['vr', 'metaverse', 'vision pro', 'quest', 'augmented reality', 'virtual reality', 'meta quest', 'kính thực tế ảo'],
  Camera: ['camera', 'gopro', 'dji', 'drone', 'mirrorless', 'photography', 'nhiếp ảnh', 'máy ảnh'],
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
