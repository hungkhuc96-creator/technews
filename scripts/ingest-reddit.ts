import { createServiceClient } from '../lib/db/client.js';
import { upsertPosts } from '../lib/db/posts.js';
import { ingestReddit } from '../lib/sources/ingestReddit.js';
import { getAppToken } from '../lib/sources/redditAuth.js';
import { REDDIT_SOURCES } from '../lib/sources/redditSeeds.js';

async function main() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Thiếu REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET trong .env.local');
  }
  const token = await getAppToken(clientId, clientSecret);
  const client = createServiceClient();
  const result = await ingestReddit(REDDIT_SOURCES, {
    token,
    upsert: (posts) => upsertPosts(client, posts),
  });
  console.log('Ingest Reddit xong:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
