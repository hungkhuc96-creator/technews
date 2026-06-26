import { createServiceClient } from '../lib/db/client.js';
import { createChat } from '../lib/summarize/llmClient.js';
import { runSummarize } from '../lib/summarize/runSummarize.js';

async function main() {
  const r = await runSummarize(createServiceClient(), createChat(), { limit: 40 });
  console.log('Tóm tắt xong:', r);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
