import { createServiceClient } from '../lib/db/client.js';
import { upsertPosts } from '../lib/db/posts.js';
import { ingestPress } from '../lib/sources/ingestPress.js';
import { PRESS_SOURCES } from '../lib/sources/seeds.js';

async function main() {
  const client = createServiceClient();
  const result = await ingestPress(PRESS_SOURCES, {
    upsert: (posts) => upsertPosts(client, posts),
  });
  console.log('Ingest báo chí xong:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
