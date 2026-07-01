import { createServiceClient } from '@/lib/db/client';
import { getFeed } from '@/lib/feed/getFeed';
import { FeedApp } from '@/components/FeedApp';

// Lưu HTML ở CDN, tự làm mới ngầm mỗi 120s (ISR) → khách nhận bản có sẵn tức thì,
// không phải chờ render + 6 truy vấn DB. Dữ liệu trễ tối đa 2 phút (cron vốn 15 phút).
export const revalidate = 120;

// Số cụm báo chí nạp sẵn ở trang đầu. Cuộn vô hạn sẽ xin tiếp từ offset này.
const FIRST_PAGE = 40;

export default async function Home() {
  const items = await getFeed(createServiceClient(), FIRST_PAGE);

  // Đếm số card mỗi nguồn (thật) cho thanh "Lọc nguồn".
  const counts: Record<string, number> = {};
  for (const it of items) {
    const k = it.sourceTypes[0] ?? 'press';
    counts[k] = (counts[k] ?? 0) + 1;
  }

  return <FeedApp items={items} counts={counts} initialOffset={FIRST_PAGE} />;
}
