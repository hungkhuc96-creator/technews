import { createServiceClient } from '@/lib/db/client';
import { createChat } from '@/lib/summarize/llmClient';
import { summarizeDiscussionById } from '@/lib/summarize/discussion';
import { isUuid } from '@/lib/util/uuid';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

let chat: ReturnType<typeof createChat> | null = null;

// "Cộng đồng nói gì" cho bài HN/Reddit — gọi khi mở bài trong panel đọc.
// Có cache thì trả ngay; chưa có thì lấy bình luận + AI tóm tắt rồi cache vĩnh viễn.
export async function POST(req: Request) {
  const { postId } = (await req.json()) as { postId?: string };
  if (!isUuid(postId)) return Response.json({ error: 'postId không hợp lệ' }, { status: 400 });

  try {
    chat ??= createChat();
    const summary = await summarizeDiscussionById(createServiceClient(), chat, postId);
    return Response.json({ summary });
  } catch (err) {
    console.error('[api/discussion-summary] lỗi:', err);
    return Response.json({ summary: null, error: String(err) }, { status: 500 });
  }
}
