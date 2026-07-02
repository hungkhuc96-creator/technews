import { createServiceClient } from '../lib/db/client.js';
import { createVideoChat } from '../lib/summarize/geminiClient.js';
import { summarizeRecentVideos, fetchDurationSec } from '../lib/summarize/videoBatch.js';

// Tóm tắt SẴN ý chính video mới (≤20 phút) — chạy sau ingest:youtube trong cron.
// Podcast dài bị bỏ qua (tóm tắt lazy khi người dùng bấm) để tiết kiệm token.
async function main() {
  const client = createServiceClient();
  const r = await summarizeRecentVideos(client, {
    videoChat: createVideoChat(),
    getDurationSec: fetchDurationSec,
  });
  console.log('Tóm tắt video xong:', r);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
