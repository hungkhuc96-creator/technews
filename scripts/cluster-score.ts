import { createServiceClient } from '../lib/db/client.js';
import { runClustering } from '../lib/cluster/runClustering.js';
import { runScoring } from '../lib/score/runScoring.js';
import { embedText } from '../lib/enrich/embed.js';

async function main() {
  const client = createServiceClient();
  console.log('Đang gom cụm (tạo embedding cho từng tin — lần đầu hơi lâu)...');
  const c = await runClustering(client, { embed: embedText });
  console.log('Gom cụm xong:', c);
  const s = await runScoring(client);
  console.log('Chấm điểm xong:', s);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
