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
    'Hãy viết bằng TIẾNG VIỆT, khách quan, súc tích:',
    '- "title": một tiêu đề tiếng Việt ngắn gọn, hấp dẫn cho sự kiện (tối đa ~15 từ).',
    '- "summary": 2-3 câu tóm tắt sự kiện.',
    '- "bullets": 2-3 ý chính ngắn gọn.',
    'Chỉ trả về JSON đúng định dạng: {"title": "...", "summary": "...", "bullets": ["...", "..."]}',
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
