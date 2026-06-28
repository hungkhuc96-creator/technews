// Một lần: dịch tiêu đề các video YouTube CŨ đang còn tiếng Anh trong DB.
// (Luồng nạp mới đã tự dịch video mới; script này xử lý dữ liệu cũ vì upsert
//  dùng ignoreDuplicates nên không tự cập nhật được bản đã có.)
import { createServiceClient } from '../lib/db/client.js';
import { createChat } from '../lib/summarize/llmClient.js';

async function main() {
  const client = createServiceClient();
  const chat = createChat();

  const { data, error } = await client
    .from('posts')
    .select('id, title, text')
    .eq('source_type', 'youtube')
    .limit(1000);
  if (error) throw new Error(`đọc posts lỗi: ${error.message}`);

  // Chưa dịch = text rỗng (đã dịch thì text = tiêu đề gốc tiếng Anh).
  const rows = (data ?? []).filter((r) => !r.text || String(r.text).trim() === '');
  console.log(`YouTube cần dịch: ${rows.length}`);
  if (!rows.length) return;

  const chunk = 15;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    const titles = batch.map((r) => r.title as string);
    const prompt =
      'Dịch danh sách tiêu đề video công nghệ sau sang tiếng Việt tự nhiên, gọn, ' +
      'GIỮ NGUYÊN tên riêng/tên sản phẩm/thuật ngữ (vd iPhone, RTX 5090, M4). ' +
      'CHỈ trả về một mảng JSON các chuỗi đã dịch, ĐÚNG THỨ TỰ và ĐÚNG SỐ LƯỢNG, ' +
      'không thêm bất kỳ chữ nào khác.\n\n' + JSON.stringify(titles);

    let vi = titles;
    try {
      const raw = await chat(prompt);
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        const arr = JSON.parse(m[0]);
        if (Array.isArray(arr) && arr.length === titles.length) vi = arr.map((x) => String(x));
      }
    } catch (err) {
      console.warn('  dịch lô lỗi, bỏ qua:', err);
    }

    for (let j = 0; j < batch.length; j++) {
      const t = (vi[j] ?? '').trim();
      if (!t || t === batch[j].title) continue;
      await client.from('posts').update({ title: t, text: batch[j].title }).eq('id', batch[j].id);
    }
    console.log(`  ${Math.min(i + chunk, rows.length)}/${rows.length}`);
  }
  console.log('Backfill YouTube xong.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
