import { createServiceClient } from '@/lib/db/client';
import { createVideoChat } from '@/lib/summarize/geminiClient';
import { videoSummaryById } from '@/lib/summarize/videoSummary';

export const dynamic = 'force-dynamic';
// Gemini phải "xem" cả video — có thể mất 20-50 giây cho video dài.
export const maxDuration = 60;

let videoChat: ReturnType<typeof createVideoChat> | null = null;

// Ý chính video (4-6 gạch đầu dòng) — gọi khi bấm nút trong panel xem video.
// Có cache thì trả ngay, chưa có thì Gemini xem video rồi cache vĩnh viễn.
export async function POST(req: Request) {
  const { postId } = (await req.json()) as { postId?: string };
  if (!postId) return Response.json({ error: 'thiếu postId' }, { status: 400 });

  try {
    videoChat ??= createVideoChat();
    const summary = await videoSummaryById(createServiceClient(), videoChat, postId);
    return Response.json({ summary });
  } catch (err) {
    return Response.json({ summary: null, error: String(err) }, { status: 200 });
  }
}
