import { createServiceClient } from '../lib/db/client.js';
import { createChat } from '../lib/summarize/llmClient.js';
import { makeTitleTranslator } from '../lib/summarize/batchTranslate.js';
import { runTranslateTitles } from '../lib/summarize/translateTitles.js';

// Dịch tiêu đề (eager) cho cụm báo chí mới → feed luôn tiếng Việt dù chưa tóm tắt.
async function main() {
  const client = createServiceClient();
  const translate = makeTitleTranslator(createChat());
  const r = await runTranslateTitles(client, translate);
  console.log('Dịch tiêu đề cụm xong:', r);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
