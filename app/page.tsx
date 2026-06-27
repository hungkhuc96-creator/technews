import { createServiceClient } from '@/lib/db/client';
import { getFeed } from '@/lib/feed/getFeed';
import { FeedApp } from '@/components/FeedApp';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const items = await getFeed(createServiceClient(), 40);

  // Đếm số card mỗi nguồn (thật) cho thanh "Lọc nguồn".
  const counts: Record<string, number> = {};
  for (const it of items) {
    const k = it.sourceTypes[0] ?? 'press';
    counts[k] = (counts[k] ?? 0) + 1;
  }

  return <FeedApp items={items} counts={counts} />;
}
