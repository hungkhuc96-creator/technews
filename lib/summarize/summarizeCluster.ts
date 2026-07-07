export interface ArticleInput {
  title: string;
  text: string;
  sourceName: string | null;
}

export interface ClusterSummary {
  titleVi: string;
  summary: string;
  bullets: string[];
}

export type ChatFn = (prompt: string) => Promise<string>;

export function buildPrompt(articles: ArticleInput[]): string {
  const list = articles
    .map((a, i) => `${i + 1}. [${a.sourceName ?? 'Nguồn'}] ${a.title}\n${a.text}`)
    .join('\n\n');
  return [
    'Bạn là biên tập viên công nghệ. Dưới đây là các bài báo (tiếng Anh) về CÙNG một sự kiện:',
    '',
    list,
    '',
    'Hãy viết bằng TIẾNG VIỆT, khách quan, súc tích, CHỈ dựa trên thông tin trong bài (không suy diễn thêm):',
    // "title" phải bám CÁC TIÊU ĐỀ gốc, cấm suy ra sự kiện từ đoạn trích — đoạn
    // trích RSS nhiều khi chỉ là bối cảnh dẫn dắt (case thật: bài "5 phụ kiện nên
    // mua cho Xiaomi 17T" mở đầu bằng "Xiaomi ra mắt 17T hồi tháng 5" → AI đặt
    // tiêu đề thành tin ra mắt cũ rích, lệch hẳn nội dung bài).
    '- "title": tiêu đề tiếng Việt ngắn gọn (tối đa ~15 từ), PHẢI truyền tải đúng ý của các TIÊU ĐỀ gốc ở trên (giữ nguyên tên riêng/sản phẩm). KHÔNG tự suy ra sự kiện từ phần nội dung bài — đoạn đầu bài thường chỉ là bối cảnh cũ để dẫn dắt.',
    '- "summary": 2-3 câu tóm tắt sự kiện.',
    'Chỉ trả về JSON đúng định dạng: {"title": "...", "summary": "..."}',
  ].join('\n');
}

export function parseSummary(raw: string): ClusterSummary {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const obj = JSON.parse(s) as { title?: unknown; summary?: unknown; bullets?: unknown };
  const titleVi = String(obj.title ?? '').trim();
  const summary = String(obj.summary ?? '').trim();
  const bullets = Array.isArray(obj.bullets)
    ? obj.bullets.map((b) => String(b).trim()).filter(Boolean)
    : [];
  if (!summary) throw new Error('parseSummary: thiếu summary');
  return { titleVi, summary, bullets };
}

export async function summarizeCluster(
  articles: ArticleInput[],
  chat: ChatFn,
): Promise<ClusterSummary> {
  const raw = await chat(buildPrompt(articles));
  return parseSummary(raw);
}
