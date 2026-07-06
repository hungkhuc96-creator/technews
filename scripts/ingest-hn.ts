import { createServiceClient } from '../lib/db/client.js';
import { upsertPosts } from '../lib/db/posts.js';
import { ingestHn } from '../lib/sources/ingestHn.js';
import { createChat } from '../lib/summarize/llmClient.js';

async function main() {
  const client = createServiceClient();
  const chat = createChat();
  const translate = (text: string) =>
    chat(
      'Dịch tiêu đề tin công nghệ sau sang tiếng Việt tự nhiên, gọn, giữ nguyên ' +
      'thuật ngữ/tên riêng. CHỈ trả về bản dịch:\n\n' + text,
    );

  const result = await ingestHn({
    upsert: (posts) => upsertPosts(client, posts),
    translate,
  });
  console.log('Ingest Hacker News xong:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
