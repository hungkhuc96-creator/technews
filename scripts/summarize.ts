import { createServiceClient } from '../lib/db/client.js';
import { createChat } from '../lib/summarize/llmClient.js';
import { runSummarize } from '../lib/summarize/runSummarize.js';

// EAGER: tóm tắt SẴN top-N cụm nóng nhất (mặc định 100) → bấm vào bài là hiện ngay,
// không phải chờ. Phần rất sâu (ngoài top-N) vẫn tóm tắt LAZY khi bấm (app/api/summary).
// Đổi số lượng qua biến môi trường SUMMARIZE_LIMIT nếu cần.
async function main() {
  const limit = Number(process.env.SUMMARIZE_LIMIT ?? 100);
  const r = await runSummarize(createServiceClient(), createChat(), { limit });
  console.log('Tóm tắt (eager top) xong:', r);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
