import { createServiceClient } from '@/lib/db/client';
import { createChat } from '@/lib/summarize/llmClient';
import { detailSummaryById } from '@/lib/summarize/detailSummary';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

let chat: ReturnType<typeof createChat> | null = null;

// Tóm tắt CHI TIẾT (8-12 câu) cho 1 cụm — gọi khi bấm nút trong panel đọc.
// Đã có cache thì trả ngay, chưa có thì tạo (mất vài giây) rồi cache vĩnh viễn.
export async function POST(req: Request) {
  const { clusterId } = (await req.json()) as { clusterId?: string };
  if (!clusterId) return Response.json({ error: 'thiếu clusterId' }, { status: 400 });

  try {
    chat ??= createChat();
    const detail = await detailSummaryById(createServiceClient(), chat, clusterId);
    return Response.json({ detail });
  } catch (err) {
    return Response.json({ detail: null, error: String(err) }, { status: 200 });
  }
}
