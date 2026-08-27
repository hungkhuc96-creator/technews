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
  // GIỚI HẠN top-N cụm NÓNG nhất mỗi lượt (clusters xếp theo heat) — nếu dịch TẤT CẢ
  // khi backlog lớn (vd sau đợt hết credit), bước này quá 14' timeout → BỊ HỦY → không
  // lưu gì (runTranslateTitles dịch hết rồi mới lưu). 200 đủ phủ feed + hoàn tất kịp;
  // tin sâu nguội để lượt sau/ bỏ (đúng hướng tiết kiệm — chỉ dịch tin sẽ hiển thị).
  const limit = Number(process.env.TITLES_LIMIT ?? 200);
  const translate = makeTitleTranslator(createChat());
  const r = await runTranslateTitles(client, translate, { limit });
  console.log('Dịch tiêu đề cụm xong:', r);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
