import { createServiceClient } from '@/lib/db/client';
import { createVideoChat } from '@/lib/summarize/geminiClient';
import { videoSummaryById } from '@/lib/summarize/videoSummary';
import { isUuid } from '@/lib/util/uuid';

export const dynamic = 'force-dynamic';
// Gemini phải "xem" cả video — video ngắn ~30s, podcast dài cả tiếng có thể mất
// vài phút. 300s là trần của Vercel Fluid Compute (gói Hobby).
export const maxDuration = 300;

let videoChat: ReturnType<typeof createVideoChat> | null = null;

// Ý chính video (4-6 gạch đầu dòng) — gọi khi bấm nút trong panel xem video.
// Có cache thì trả ngay, chưa có thì Gemini xem video rồi cache vĩnh viễn.
export async function POST(req: Request) {
  const { postId } = (await req.json()) as { postId?: string };
  if (!isUuid(postId)) return Response.json({ error: 'postId không hợp lệ' }, { status: 400 });

  try {
    videoChat ??= createVideoChat();
    const summary = await videoSummaryById(createServiceClient(), videoChat, postId);
    return Response.json({ summary });
  } catch (err) {
    console.error('[api/video-summary] lỗi:', err);
    return Response.json({ summary: null, error: String(err) }, { status: 500 });
  }
}
