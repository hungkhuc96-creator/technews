import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatFn, ArticleInput } from './summarizeCluster';

// Tóm tắt CHI TIẾT: 8-12 câu đủ ý (số liệu, diễn biến, trích dẫn chính) — người
// đọc hiểu gần trọn bài mà không cần bản dịch nguyên văn (tránh rủi ro bản quyền).
// Khác tóm tắt ngắn: nạp NHIỀU nội dung bài gốc hơn cho AI (bài chính 3500 ký tự).
export function buildDetailPrompt(articles: ArticleInput[]): string {
  const list = articles
    .map((a, i) => `${i + 1}. [${a.sourceName ?? 'Nguồn'}] ${a.title}\n${a.text}`)
    .join('\n\n');
  return [
    'Bạn là biên tập viên công nghệ. Dưới đây là các bài báo (tiếng Anh) về CÙNG một sự kiện:',
    '',
    list,
    '',
    'Hãy viết MỘT bản tóm tắt CHI TIẾT bằng TIẾNG VIỆT (8-12 câu, 2-3 đoạn):',
    '- Đủ các ý chính, số liệu, mốc thời gian, diễn biến và trích dẫn quan trọng trong bài.',
    '- Khách quan, CHỈ dựa trên thông tin trong bài (không suy diễn thêm).',
    '- GIỮ NGUYÊN tên riêng/sản phẩm/thuật ngữ (vd iPhone, RTX 5090, M4).',
    'CHỈ trả về phần tóm tắt (văn xuôi, xuống dòng giữa các đoạn), không tiêu đề, không lời dẫn.',
  ].join('\n');
}

function sourceName(p: { sources?: unknown }): string | null {
  const s = (p as { sources?: { name?: string } | { name?: string }[] }).sources;
  if (Array.isArray(s)) return s[0]?.name ?? null;
  return s?.name ?? null;
}

// Tạo (hoặc lấy cache) tóm tắt chi tiết cho 1 cụm. Cache VĨNH VIỄN theo cụm —
// tin tức ít thay đổi sau khi đã đọc, không cần theo dõi input_hash như bản ngắn.
export async function detailSummaryById(
  client: SupabaseClient,
  chat: ChatFn,
  clusterId: string,
): Promise<string | null> {
  const { data: existing } = await client
    .from('cluster_summaries')
    .select('detail_vi')
    .eq('cluster_id', clusterId)
    .maybeSingle();
  if (existing?.detail_vi) return existing.detail_vi;

  const { data: posts } = await client
    .from('posts')
    .select('id, title, text, sources(name)')
    .eq('cluster_id', clusterId)
    .order('published_at', { ascending: false });
  if (!posts || posts.length === 0) return null;

  // Bài mới nhất (thường đầy đủ nhất) cho 3500 ký tự; các bài phụ 400 ký tự/bài.
  const articles: ArticleInput[] = posts.slice(0, 5).map((p, i) => ({
    title: p.title,
    text: (p.text ?? '').slice(0, i === 0 ? 3500 : 400),
    sourceName: sourceName(p),
  }));

  const detail = (await chat(buildDetailPrompt(articles))).trim();
  if (!detail) return null;

  // Dòng chưa có → chèn placeholder (ignoreDuplicates: không đè dòng ai đó vừa
  // tạo), rồi update RIÊNG detail_vi — không đụng title/summary có sẵn.
  if (!existing) {
    await client.from('cluster_summaries').upsert(
      { cluster_id: clusterId, summary_vi: '', bullets_vi: [], input_hash: '' },
      { onConflict: 'cluster_id', ignoreDuplicates: true },
    );
  }
  await client.from('cluster_summaries').update({ detail_vi: detail }).eq('cluster_id', clusterId);
  return detail;
}
