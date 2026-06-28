import { createServiceClient } from '../lib/db/client.js';
import { createChat } from '../lib/summarize/llmClient.js';
import { runSummarize } from '../lib/summarize/runSummarize.js';

// EAGER: chỉ tóm tắt sẵn top-N cụm nóng nhất (mặc định 3) để hero/đầu feed không
// trống. Phần còn lại tóm tắt LAZY khi người đọc bấm vào (xem app/api/summary).
// Đổi số lượng qua biến môi trường SUMMARIZE_LIMIT nếu cần.
async function main() {
  const limit = Number(process.env.SUMMARIZE_LIMIT ?? 3);
  const r = await runSummarize(createServiceClient(), createChat(), { limit });
  console.log('Tóm tắt (eager top) xong:', r);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
