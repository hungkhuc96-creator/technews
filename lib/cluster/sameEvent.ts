import type { ChatFn } from '../summarize/summarizeCluster';

// "Người gác cổng" gom cụm: hỏi AI xem 2 tiêu đề có tường thuật CÙNG MỘT sự kiện
// cụ thể không (kiểu nhiều báo cùng đưa một tin), hay chỉ tình cờ cùng hãng/chủ đề.
// Đây là CHỐT CHẶN quyết định gộp — embedding chỉ lọc ứng viên phía trước.
export function makeSameEvent(chat: ChatFn): (a: string, b: string) => Promise<boolean> {
  return async (a: string, b: string) => {
    const prompt = `Bạn là bộ lọc gom tin công nghệ. Cho 2 tiêu đề báo. Trả lời DUY NHẤT "yes" hoặc "no", không giải thích.

"yes" = hai tiêu đề tường thuật CÙNG MỘT sự kiện/thông tin cụ thể (cùng một lần ra mắt, cùng một báo cáo, cùng một sự việc) — kiểu các báo khác nhau cùng đưa một tin.
"no" = KHÁC sự kiện, dù cùng hãng hay cùng chủ đề. Ví dụ phải trả lời "no": "ra mắt sản phẩm" với "doanh số sụt giảm"; hai bài đố vui/số báo khác ngày; hai sản phẩm khác nhau của cùng hãng; tin của hãng A với tin của hãng B.

A: "${a}"
B: "${b}"
Trả lời:`;
    const out = (await chat(prompt)).trim().toLowerCase();
    return out.startsWith('yes') || out.startsWith('có');
  };
}
