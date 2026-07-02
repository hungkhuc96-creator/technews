import { createServiceClient } from '../lib/db/client.js';
import { upsertPosts, refreshMetrics } from '../lib/db/posts.js';
import { ingestYoutube } from '../lib/sources/ingestYoutube.js';
import { YOUTUBE_SOURCES } from '../lib/sources/youtubeSeeds.js';
import { createChat } from '../lib/summarize/llmClient.js';

async function main() {
  const client = createServiceClient();
  const chat = createChat();

  // Dịch CẢ LÔ tiêu đề trong 1 lần gọi Claude → tiết kiệm, ít rate-limit.
  // Trả về mảng JSON cùng thứ tự; lỗi gì cũng trả lại bản gốc (an toàn).
  const translateTitles = async (titles: string[]): Promise<string[]> => {
    if (!titles.length) return titles;
    const prompt =
      'Dịch danh sách tiêu đề video công nghệ sau sang tiếng Việt tự nhiên, gọn, ' +
      'GIỮ NGUYÊN tên riêng/tên sản phẩm/thuật ngữ (vd iPhone, RTX 5090, M4). ' +
      'CHỈ trả về một mảng JSON các chuỗi đã dịch, ĐÚNG THỨ TỰ và ĐÚNG SỐ LƯỢNG, ' +
      'không thêm bất kỳ chữ nào khác.\n\n' + JSON.stringify(titles);
    try {
      const raw = await chat(prompt);
      const m = raw.match(/\[[\s\S]*\]/);
      if (!m) return titles;
      const arr = JSON.parse(m[0]);
      if (Array.isArray(arr) && arr.length === titles.length) return arr.map((x) => String(x));
    } catch {
      /* dịch lỗi → giữ tiêu đề gốc */
    }
    return titles;
  };

  const result = await ingestYoutube(YOUTUBE_SOURCES, {
    upsert: (posts) => upsertPosts(client, posts),
    translateTitles,
    // Làm tươi lượt xem video đã có trong DB (7 ngày gần nhất) → ranking đúng độ hot.
    refreshMetrics: (posts) => refreshMetrics(client, posts),
  });
  console.log('Ingest YouTube xong:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
