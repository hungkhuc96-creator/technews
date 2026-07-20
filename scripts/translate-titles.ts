import { createServiceClient } from '../lib/db/client.js';
import { createChat } from '../lib/summarize/llmClient.js';
import { makeTitleTranslator } from '../lib/summarize/batchTranslate.js';
import { runTranslateTitles } from '../lib/summarize/translateTitles.js';
import { shouldRun } from '../lib/util/throttle.js';

// Dịch tiêu đề (eager) cho cụm báo chí mới → feed luôn tiếng Việt dù chưa tóm tắt.
// Giãn nhịp: gom cụm chạy 15 phút/lần nhưng dịch chỉ mỗi ~30 phút (tiết kiệm Claude).
async function main() {
  const client = createServiceClient();
  if (!(await shouldRun(client, 'titles', 28))) {
    console.log('Bỏ qua dịch tiêu đề (giãn nhịp 30 phút — mới chạy < 28 phút).');
    return;
  }
  const translate = makeTitleTranslator(createChat());
  const r = await runTranslateTitles(client, translate);
  console.log('Dịch tiêu đề cụm xong:', r);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
