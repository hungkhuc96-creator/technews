export type FetchImpl = typeof fetch;

export async function fetchFeed(
  url: string,
  fetchImpl: FetchImpl = fetch,
  headers: Record<string, string> = {},
): Promise<string> {
  const res = await fetchImpl(url, {
    headers: { 'user-agent': 'nong-techfeed/0.1 (+https://example.com)', ...headers },
  });
  if (!res.ok) {
    throw new Error(`fetchFeed ${url} thất bại: HTTP ${res.status}`);
  }
  return await res.text();
}
