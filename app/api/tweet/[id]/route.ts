import { getTweet } from 'react-tweet/api';

export const dynamic = 'force-dynamic';

// Proxy dữ liệu tweet cho <Tweet> (react-tweet) — TỰ CHỦ trên server mình,
// nguồn là cdn.syndication.twimg.com (CDN công khai của CHÍNH X, không cần login).
// Không dùng API mặc định react-tweet.vercel.app để khỏi phụ thuộc thêm bên ngoài.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: 'id không hợp lệ' }, { status: 400 });
  }
  try {
    const tweet = await getTweet(id);
    // Cache 1 giờ ở CDN Vercel — tweet cũ ít đổi, đỡ gọi lại syndication.
    return Response.json(
      { data: tweet ?? null },
      { headers: { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch (err) {
    return Response.json({ data: null, error: String(err) }, { status: 200 });
  }
}
