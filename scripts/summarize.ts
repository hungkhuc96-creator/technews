import { createServiceClient } from '../lib/db/client.js';
import { createChat } from '../lib/summarize/llmClient.js';
import { runSummarize } from '../lib/summarize/runSummarize.js';
import { shouldRun } from '../lib/util/throttle.js';

// EAGER: tóm tắt SẴN top-N cụm nóng nhất (mặc định 20) → bấm vào bài là hiện ngay,
// không phải chờ. Phần rất sâu (ngoài top-N) vẫn tóm tắt LAZY khi bấm (app/api/summary).
// Đổi số lượng qua biến môi trường SUMMARIZE_LIMIT nếu cần.
// Giãn nhịp: chỉ tóm tắt mỗi ~30 phút (gom cụm vẫn 15 phút) để tiết kiệm Claude.
async function main() {
  const client = createServiceClient();
  if (!(await shouldRun(client, 'summarize', 28))) {
    console.log('Bỏ qua tóm tắt (giãn nhịp 30 phút — mới chạy < 28 phút).');
    return;
  }
  const limit = Number(process.env.SUMMARIZE_LIMIT ?? 20);
  const r = await runSummarize(client, createChat(), { limit });
  console.log('Tóm tắt (eager top) xong:', r);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
