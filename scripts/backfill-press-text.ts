// Một lần: cập nhật đoạn trích (text) cho các bài báo ĐÃ CÓ trong DB bằng bản
// dài hơn (ưu tiên content:encoded). Cần vì upsert dùng ignoreDuplicates nên
// không tự cập nhật được bài cũ.
import { createServiceClient } from '../lib/db/client.js';
import { fetchFeed } from '../lib/sources/fetchFeed.js';
import { parsePressFeed } from '../lib/sources/press.js';
import { PRESS_SOURCES } from '../lib/sources/seeds.js';

async function main() {
  const client = createServiceClient();
  let updated = 0;

  for (const source of PRESS_SOURCES) {
    try {
      const xml = await fetchFeed(source.feedUrl);
      const posts = await parsePressFeed(xml, source);
      for (const p of posts) {
        if (!p.text) continue;
        const { data } = await client
          .from('posts')
          .update({ text: p.text })
          .eq('source_type', 'press')
          .eq('external_id', p.externalId)
          .select('id');
        updated += data?.length ?? 0;
      }
      console.log(`  ${source.name}: ${posts.length} bài (đối chiếu)`);
    } catch (err) {
      console.warn(`  bỏ qua "${source.name}":`, err);
    }
  }

  console.log(`Backfill press text xong. Đã cập nhật ${updated} bài.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
