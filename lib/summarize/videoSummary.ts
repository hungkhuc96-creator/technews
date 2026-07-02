import type { SupabaseClient } from '@supabase/supabase-js';
import type { VideoChatFn } from './geminiClient';

// "Ý chính video": Gemini xem video YouTube và rút 4-6 ý chính tiếng Việt.
// Lazy (bấm nút mới tạo) + cache VĨNH VIỄN vào posts.video_summary_vi —
// 1 video chỉ tốn 1 lần gọi Gemini cho mọi người đọc, y hệt detail_vi của báo.
export function buildVideoPrompt(): string {
  return [
    'Xem video này và tóm tắt bằng TIẾNG VIỆT dưới dạng 4-6 gạch đầu dòng (mỗi dòng bắt đầu bằng "- "):',
    '- Mỗi gạch là MỘT ý chính/kết luận/số liệu đáng chú ý trong video.',
    '- Khách quan, CHỈ dựa trên nội dung video (không suy diễn thêm).',
    '- GIỮ NGUYÊN tên riêng/sản phẩm/thuật ngữ (vd iPhone, RTX 5090, M4).',
    '- Bỏ qua phần quảng cáo/tài trợ trong video.',
    'CHỈ trả về các gạch đầu dòng, không tiêu đề, không lời dẫn.',
  ].join('\n');
}

// Gemini thỉnh thoảng thêm lời dẫn ("Dưới đây là tóm tắt...") dù đã dặn không —
// chỉ giữ các dòng gạch đầu dòng. Nếu format lạ (không có gạch) thì giữ nguyên.
export function cleanBullets(raw: string): string {
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-*•]/.test(l));
  return (bullets.length >= 2 ? bullets : lines).join('\n');
}

export async function videoSummaryById(
  client: SupabaseClient,
  videoChat: VideoChatFn,
  postId: string,
): Promise<string | null> {
  const { data: post } = await client
    .from('posts')
    .select('id, url, source_type, video_summary_vi')
    .eq('id', postId)
    .maybeSingle();
  if (!post || post.source_type !== 'youtube') return null;
  if (post.video_summary_vi) return post.video_summary_vi; // cache → trả ngay

  const summary = cleanBullets((await videoChat(post.url, buildVideoPrompt())).trim());
  if (!summary) return null;

  await client.from('posts').update({ video_summary_vi: summary }).eq('id', postId);
  return summary;
}
