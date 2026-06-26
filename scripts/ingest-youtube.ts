import { createServiceClient } from '../lib/db/client.js';
import { upsertPosts } from '../lib/db/posts.js';
import { ingestYoutube } from '../lib/sources/ingestYoutube.js';
import { YOUTUBE_SOURCES } from '../lib/sources/youtubeSeeds.js';

async function main() {
  const client = createServiceClient();
  const result = await ingestYoutube(YOUTUBE_SOURCES, {
    upsert: (posts) => upsertPosts(client, posts),
  });
  console.log('Ingest YouTube xong:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
