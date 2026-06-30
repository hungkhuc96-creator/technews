// DỌN 1 LẦN: xây lại toàn bộ cụm báo chí với "người gác cổng AI".
// Gỡ gán cụm cũ → xoá cụm + tóm tắt → gom lại (embedding lọc + AI chốt) → chấm điểm.
// Embedding đã lưu sẵn trên post nên KHÔNG tính lại. Chạy: npm run recluster
import { createServiceClient } from '../lib/db/client.js';
import { runClustering } from '../lib/cluster/runClustering.js';
import { runScoring } from '../lib/score/runScoring.js';
import { embedText } from '../lib/enrich/embed.js';
import { makeSameEvent } from '../lib/cluster/sameEvent.js';
import { createChat } from '../lib/summarize/llmClient.js';

async function main() {
  const client = createServiceClient();
  const t0 = Date.now();

  console.log('1/4 Gỡ gán cụm cho mọi tin báo chí…');
  const { error: e1 } = await client
    .from('posts').update({ cluster_id: null }).eq('source_type', 'press');
  if (e1) throw new Error(`gỡ gán lỗi: ${e1.message}`);

  console.log('2/4 Xoá tóm tắt + cụm cũ…');
  await client.from('cluster_summaries').delete().not('cluster_id', 'is', null);
  await client.from('clusters').delete().gte('post_count', 0);

  console.log('3/4 Gom cụm lại (embedding lọc + AI chốt cùng sự kiện)…');
  const sameEvent = makeSameEvent(createChat());
  const c = await runClustering(client, { embed: embedText, sameEvent });
  console.log('   →', c);

  console.log('4/4 Chấm điểm độ nóng…');
  const s = await runScoring(client);
  console.log('   →', s);

  console.log(`XONG sau ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
