import type { ChatFn } from './summarizeCluster';

// Dịch tối đa ngần này tiêu đề mỗi lần gọi. Lô lớn dễ tràn max_tokens → JSON cụt →
// dịch hỏng (trả về bản gốc tiếng Anh). Chia nhỏ để mỗi lần gọi luôn đủ chỗ.
const CHUNK = 8;

// Tạo hàm dịch CẢ LÔ tiêu đề (tự chia nhỏ thành nhiều lần gọi Claude, ghép lại theo
// đúng thứ tự). Lô con nào lỗi → giữ nguyên bản gốc lô đó. Dùng chung báo chí + YouTube.
export function makeTitleTranslator(chat: ChatFn): (titles: string[]) => Promise<string[]> {
  const translateChunk = async (titles: string[]): Promise<string[]> => {
    if (!titles.length) return titles;
    const prompt =
      'Dịch danh sách tiêu đề công nghệ sau sang tiếng Việt tự nhiên, gọn, ' +
      'GIỮ NGUYÊN tên riêng/tên sản phẩm/thuật ngữ (vd iPhone, RTX 5090, M4). ' +
      'CHỈ trả về một mảng JSON các chuỗi đã dịch, ĐÚNG THỨ TỰ và ĐÚNG SỐ LƯỢNG, ' +
      'không thêm bất kỳ chữ nào khác.\n\n' + JSON.stringify(titles);
    try {
      const raw = await chat(prompt);
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        const arr = JSON.parse(m[0]);
        if (Array.isArray(arr) && arr.length === titles.length) return arr.map((x) => String(x));
      }
    } catch {
      /* dịch lỗi → giữ tiêu đề gốc */
    }
    return titles;
  };

  return async (titles: string[]): Promise<string[]> => {
    const chunks: string[][] = [];
    for (let i = 0; i < titles.length; i += CHUNK) chunks.push(titles.slice(i, i + CHUNK));
    // Các lô chạy SONG SONG cho nhanh (1 trang feed chỉ vài lô).
    const done = await Promise.all(chunks.map((ch) => translateChunk(ch)));
    return done.flat();
  };
}
