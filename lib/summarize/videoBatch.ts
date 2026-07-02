import type { SupabaseClient } from '@supabase/supabase-js';
import type { VideoChatFn } from './geminiClient';
import { videoSummaryById } from './videoSummary';

// Tóm tắt SẴN ý chính cho video mới (chạy sau ingest:youtube) — mở panel là hiện
// ngay, khỏi chờ. Video QUÁ DÀI (podcast) bị bỏ qua để tiết kiệm token Gemini —
// loại này vẫn tóm tắt lazy khi người dùng bấm nút trong panel.
export interface VideoBatchDeps {
  videoChat: VideoChatFn;
  // Độ dài video (giây) — null = không xác định được (an toàn: bỏ qua, để lazy).
  getDurationSec: (videoUrl: string) => Promise<number | null>;
  maxDurationSec?: number; // mặc định 20 phút
  limit?: number;          // trần video xử lý mỗi lượt (giữ trong hạn mức free Gemini)
  maxAgeHours?: number;    // chỉ video mới (mặc định 48h)
  // CHỈ xử lý post có url bắt đầu bằng chuỗi này — dành cho TEST. Không có filter
  // này, test từng quét sạch video THẬT và cache chuỗi giả vào production.
  urlPrefix?: string;
}

export async function summarizeRecentVideos(
  client: SupabaseClient,
  deps: VideoBatchDeps,
): Promise<{ checked: number; summarized: number; skippedLong: number; failed: number }> {
  const maxDur = deps.maxDurationSec ?? 20 * 60;
  const limit = deps.limit ?? 12;
  const maxAge = deps.maxAgeHours ?? 48;
  const since = new Date(Date.now() - maxAge * 3600_000).toISOString();

  let query = client
    .from('posts')
    .select('id, url, title')
    .eq('source_type', 'youtube')
    .is('video_summary_vi', null)
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (deps.urlPrefix) query = query.like('url', `${deps.urlPrefix}%`);
  const { data: posts } = await query;

  let checked = 0;
  let summarized = 0;
  let skippedLong = 0;
  let failed = 0;
  for (const p of posts ?? []) {
    checked++;
    try {
      const dur = await deps.getDurationSec(p.url);
      if (dur === null || dur > maxDur) {
        skippedLong++;
        console.log(`[videoBatch] bỏ qua (${dur === null ? 'không rõ độ dài' : Math.round(dur / 60) + ' phút'}): ${p.title.slice(0, 50)}`);
        continue;
      }
      await videoSummaryById(client, deps.videoChat, p.id);
      summarized++;
    } catch (err) {
      failed++;
      console.warn(`[videoBatch] lỗi "${p.title.slice(0, 40)}":`, err);
      // 429 = hết hạn mức Gemini trong ngày → dừng sớm, gọi tiếp chỉ tốn công.
      // Video còn lại sẽ được lượt cron sau vét nốt (hạn mức reset mỗi ngày).
      if (String(err).includes('429')) {
        console.warn('[videoBatch] hết hạn mức Gemini — dừng, chờ lượt sau.');
        break;
      }
    }
  }
  return { checked, summarized, skippedLong, failed };
}

// Độ dài video từ trang watch (RSS YouTube không có trường duration).
export async function fetchDurationSec(
  videoUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number | null> {
  try {
    const res = await fetchImpl(videoUrl, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = /"lengthSeconds":"(\d+)"/.exec(html);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}
