import { createServiceClient } from '../lib/db/client.js';

// Dọn DB hằng tuần: xóa cụm rỗng + cụm archive quá 30 ngày (kèm bài của chúng).
// Logic nằm trong hàm Postgres cleanup_db (migration 0005) → chạy 1 transaction.
async function main() {
  const client = createServiceClient();
  const { data, error } = await client.rpc('cleanup_db', { archive_days: 30 });
  if (error) throw new Error(`cleanup_db lỗi: ${error.message}`);
  console.log('Dọn DB xong:', data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
