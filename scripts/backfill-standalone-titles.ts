import { createServiceClient } from '../lib/db/client.js';
import { createChat } from '../lib/summarize/llmClient.js';
import { makeTitleTranslator } from '../lib/summarize/batchTranslate.js';
import { backfillStandaloneTitles } from '../lib/sources/backfillStandaloneTitles.js';

// Dịch bù tiêu đề X/YouTube kẹt tiếng Anh (ingest lúc hết credit → chưa dịch).
async function main() {
  const translate = makeTitleTranslator(createChat());
  const r = await backfillStandaloneTitles(createServiceClient(), translate);
  console.log('Dịch bù tiêu đề X/YouTube xong:', r);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
