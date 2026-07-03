import { createServiceClient } from '@/lib/db/client';
import { createChat } from '@/lib/summarize/llmClient';
import { summarizeClusterById } from '@/lib/summarize/summarizeById';
import { isUuid } from '@/lib/util/uuid';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

let chat: ReturnType<typeof createChat> | null = null;

// Tạo (hoặc lấy cache) bản tóm tắt tiếng Việt cho 1 cụm — gọi khi mở panel đọc báo.
export async function POST(req: Request) {
  const { clusterId } = (await req.json()) as { clusterId?: string };
  if (!isUuid(clusterId)) return Response.json({ error: 'clusterId không hợp lệ' }, { status: 400 });

  try {
    chat ??= createChat();
    const s = await summarizeClusterById(createServiceClient(), chat, clusterId);
    if (!s) return Response.json({ summary: null, bullets: [] });
    return Response.json({ titleVi: s.titleVi, summary: s.summary, bullets: s.bullets });
  } catch (err) {
    console.error('[api/summary] lỗi:', err);
    return Response.json({ summary: null, bullets: [], error: String(err) }, { status: 500 });
  }
}
