// DỌN RÁC trong DB: xoá bài báo khớp bộ lọc isNoise (deal/đố vui) đã lọt vào từ
// trước khi có filter, rồi vá các cụm bị ảnh hưởng (xoá cụm rỗng, gán lại bài đại
// diện nếu bài cũ bị xoá). Chạy lại an toàn (idempotent): npm run clean:noise
import { createServiceClient } from '../lib/db/client.js';
import { isNoise } from '../lib/sources/isDeal.js';

const CHUNK = 50; // .in() với nhiều UUID làm URL quá dài → "fetch failed"

async function main() {
  const client = createServiceClient();

  // 1) Gom bài rác (phân trang — Supabase trả tối đa 1000 dòng/truy vấn)
  const bad: { id: string; cluster_id: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('posts')
      .select('id, title, cluster_id')
      .eq('source_type', 'press')
      .range(from, from + 999);
    if (error) throw new Error(`đọc posts lỗi: ${error.message}`);
    for (const p of data ?? []) {
      if (isNoise(p.title as string)) bad.push({ id: p.id, cluster_id: p.cluster_id });
    }
    if (!data || data.length < 1000) break;
  }
  console.log(`Tìm thấy ${bad.length} bài rác`);
  if (!bad.length) return;

  // 2) Xoá bài rác theo lô
  for (let i = 0; i < bad.length; i += CHUNK) {
    const { error } = await client
      .from('posts').delete().in('id', bad.slice(i, i + CHUNK).map((b) => b.id));
    if (error) throw new Error(`xoá posts lỗi: ${error.message}`);
  }
  console.log('Đã xoá bài rác');

  // 3) Vá các cụm bị ảnh hưởng
  const clusterIds = [...new Set(bad.map((b) => b.cluster_id).filter((x): x is string => !!x))];
  let emptied = 0, patched = 0;
  for (const cid of clusterIds) {
    const { data: left } = await client
      .from('posts')
      .select('id, source_id, published_at')
      .eq('cluster_id', cid)
      .order('published_at', { ascending: false });
    if (!left || left.length === 0) {
      // Cụm rỗng → xoá cả tóm tắt lẫn cụm
      await client.from('cluster_summaries').delete().eq('cluster_id', cid);
      await client.from('clusters').delete().eq('id', cid);
      emptied++;
      continue;
    }
    // Còn bài → cập nhật số đếm; nếu bài đại diện đã bị xoá thì gán bài mới nhất
    const { data: cl } = await client
      .from('clusters').select('representative_post_id').eq('id', cid).single();
    const repGone = !left.some((p) => p.id === cl?.representative_post_id);
    await client
      .from('clusters')
      .update({
        post_count: left.length,
        n_sources: new Set(left.map((p) => p.source_id)).size,
        ...(repGone ? { representative_post_id: left[0].id } : {}),
      })
      .eq('id', cid);
    patched++;
  }
  console.log(`Cụm: xoá ${emptied} cụm rỗng, vá ${patched} cụm còn bài`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
