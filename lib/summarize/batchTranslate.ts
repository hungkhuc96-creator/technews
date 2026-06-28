import type { ChatFn } from './summarizeCluster';

// Tạo hàm dịch CẢ LÔ tiêu đề trong 1 lần gọi Claude (trả về mảng JSON cùng thứ tự).
// Lỗi gì cũng trả lại bản gốc (an toàn). Dùng chung cho báo chí + YouTube.
export function makeTitleTranslator(chat: ChatFn): (titles: string[]) => Promise<string[]> {
  return async (titles: string[]): Promise<string[]> => {
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
}
