import { createChat } from '@/lib/summarize/llmClient';

export const dynamic = 'force-dynamic';

const cache = new Map<string, string>();
let chat: ReturnType<typeof createChat> | null = null;

// Dịch caption (vd tweet) sang tiếng Việt — gọi khi mở panel X. Cache theo nội dung.
export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };
  const src = (text ?? '').trim();
  if (!src) return Response.json({ vi: '' });
  if (cache.has(src)) return Response.json({ vi: cache.get(src) });

  try {
    chat ??= createChat();
    const prompt =
      'Dịch đoạn sau sang tiếng Việt tự nhiên, gọn, giữ nguyên thuật ngữ/tên riêng công nghệ. ' +
      'CHỈ trả về bản dịch, không thêm lời nào khác:\n\n' + src;
    const vi = (await chat(prompt)).trim();
    cache.set(src, vi);
    return Response.json({ vi });
  } catch (err) {
    return Response.json({ vi: '', error: String(err) }, { status: 200 });
  }
}
