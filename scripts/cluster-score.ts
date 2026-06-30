import { createServiceClient } from '../lib/db/client.js';
import { runClustering } from '../lib/cluster/runClustering.js';
import { runScoring } from '../lib/score/runScoring.js';
import { embedText } from '../lib/enrich/embed.js';
import { makeSameEvent } from '../lib/cluster/sameEvent.js';
import { createChat } from '../lib/summarize/llmClient.js';

async function main() {
  const client = createServiceClient();
  console.log('Đang gom cụm (embedding lọc ứng viên + AI chốt cùng sự kiện)...');
  const sameEvent = makeSameEvent(createChat());
  const c = await runClustering(client, { embed: embedText, sameEvent });
  console.log('Gom cụm xong:', c);
  const s = await runScoring(client);
  console.log('Chấm điểm xong:', s);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
