import type { FetchImpl } from './fetchFeed';

// OAuth "application-only" (client_credentials): token đọc dữ liệu công khai,
// không cần đăng nhập user. Token sống ~24h — script lấy 1 lần mỗi lần chạy.
export async function getAppToken(
  clientId: string,
  clientSecret: string,
  fetchImpl: FetchImpl = fetch,
): Promise<string> {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetchImpl('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'nong-techfeed/0.1 (+https://example.com)',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    throw new Error(`getAppToken thất bại: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('getAppToken: thiếu access_token trong phản hồi');
  return data.access_token;
}
