import { createServiceClient } from '../lib/db/client.js';
import { upsertPosts } from '../lib/db/posts.js';
import { ingestRedditRss } from '../lib/sources/ingestRedditRss.js';
import { REDDIT_SOURCES } from '../lib/sources/redditSeeds.js';
import { createChat } from '../lib/summarize/llmClient.js';

async function main() {
  const client = createServiceClient();
  const chat = createChat();
  const translate = (text: string) =>
    chat(
      'Dịch tiêu đề bài Reddit công nghệ sau sang tiếng Việt tự nhiên, gọn, giữ ' +
      'nguyên thuật ngữ/tên riêng. CHỈ trả về bản dịch:\n\n' + text,
    );

  // XÁO thứ tự sub mỗi lượt: Reddit hay 429 giữa chừng (nhất là từ IP GitHub
  // dùng chung) — xáo để các sub thay phiên được đứng đầu hàng, qua vài lượt
  // cron 4h là sub nào cũng có phần (bài trùng đã có upsert chống).
  const shuffled = [...REDDIT_SOURCES].sort(() => Math.random() - 0.5);
  const result = await ingestRedditRss(shuffled, {
    upsert: (posts) => upsertPosts(client, posts),
    translate,
  });
  console.log('Ingest Reddit (RSS) xong:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
