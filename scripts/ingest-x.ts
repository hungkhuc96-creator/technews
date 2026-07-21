import { createServiceClient } from '../lib/db/client.js';
import { upsertPosts } from '../lib/db/posts.js';
import { ingestX } from '../lib/sources/ingestX.js';
import { runActorGetItems } from '../lib/sources/apifyClient.js';
import { X_HANDLES } from '../lib/sources/xSeeds.js';
import { createChat } from '../lib/summarize/llmClient.js';
import { safeTranslated } from '../lib/summarize/translateSafety.js';

// kaitoeasyapi: pay-per-result rẻ, CHẠY ĐƯỢC trên gói Apify Free (apidojo chặn Free).
const ACTOR = 'kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest';

async function main() {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('Thiếu APIFY_TOKEN trong .env.local');

  const client = createServiceClient();
  const chat = createChat();
  // safeTranslated: nếu tweet là mẩu cụt/ký hiệu khiến Claude "hỏi lại" thay vì dịch
  // (case thật: tweet "B8" → "Tôi không thể dịch..."), giữ NGUYÊN bản gốc thay vì lưu
  // câu hỏi đó làm tiêu đề.
  const translate = async (text: string) =>
    safeTranslated(
      await chat(
        'Dịch tweet sau sang tiếng Việt tự nhiên, gọn, giữ nguyên thuật ngữ/tên riêng công nghệ. ' +
        'Nếu chỉ là ký hiệu/số/emoji/mẩu cụt không dịch được, TRẢ LẠI NGUYÊN VĂN, không giải thích, không hỏi lại. ' +
        'CHỈ trả về bản dịch:\n\n' + text,
      ),
      text,
    );

  const result = await ingestX(X_HANDLES, {
    runActor: (input) => runActorGetItems(ACTOR, input, token),
    upsert: (posts) => upsertPosts(client, posts),
    // LƯU Ý: actor kaito tính maxItems THEO TỪNG QUERY (không phải tổng) — với 37
    // handle chia 3 query, 15/query ≈ 45 kết quả/lượt, ngang mức 40 cũ → giữ nguyên
    // chi phí trong hạn mức $5 free/tháng của Apify.
    maxItems: 15,
    translate,      // dịch caption sang tiếng Việt khi nạp
  });
  console.log('Ingest X xong:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
