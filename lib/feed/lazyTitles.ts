import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedItem } from './getFeed';

// Dịch LAZY tiêu đề cho các tin BÁO CHÍ trong 1 trang feed mà chưa có titleVi
// (cuộn vô hạn kéo tin nguội ngoài top-80 mà cron đã dịch sẵn). Dịch xong patch
// vào item + lưu placeholder để lần sau đọc từ DB, khỏi dịch lại.
export async function fillMissingTitles(
  client: SupabaseClient,
  translateBatch: (titles: string[]) => Promise<string[]>,
  items: FeedItem[],
): Promise<FeedItem[]> {
  const todo = items.filter(
    (it) => (it.sourceTypes[0] ?? 'press') === 'press' && !it.titleVi && it.title,
  );
  if (!todo.length) return items;

  const vi = await translateBatch(todo.map((it) => it.title));
  const viByCluster = new Map<string, string>();
  for (let i = 0; i < todo.length; i++) {
    const t = (vi[i] ?? '').trim();
    if (!t || t === todo[i].title) continue; // dịch lỗi/giữ nguyên → bỏ qua
    viByCluster.set(todo[i].clusterId, t);
    // Lưu placeholder (giữ summary rỗng) — ignoreDuplicates để KHÔNG đè dòng đã có tóm tắt.
    await client.from('cluster_summaries').upsert(
      { cluster_id: todo[i].clusterId, title_vi: t, summary_vi: '', bullets_vi: [], input_hash: '' },
      { onConflict: 'cluster_id', ignoreDuplicates: true },
    );
  }

  return items.map((it) =>
    viByCluster.has(it.clusterId) ? { ...it, titleVi: viByCluster.get(it.clusterId)! } : it,
  );
}
