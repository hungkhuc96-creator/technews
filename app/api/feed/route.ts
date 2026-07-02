import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { getFeed } from '@/lib/feed/getFeed';

export const dynamic = 'force-dynamic';

// Trang tiếp theo cho cuộn vô hạn. Tiêu đề đã dịch SẴN toàn bộ bằng cron
// (titles:press dịch mọi cụm mở) — không dịch trong request nữa (từng làm trang
// cuộn sâu chờ 10-22s).
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 20, 1), 50);
  const offset = Math.max(Number(sp.get('offset')) || 0, 0);
  const sort = sp.get('sort') === 'recent' ? 'recent' as const : 'heat' as const;
  const client = createServiceClient();
  const items = await getFeed(client, limit, offset, sort);
  return NextResponse.json({ items });
}
