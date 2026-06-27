import type { FetchImpl } from './fetchFeed';

// Chạy một Apify actor ĐỒNG BỘ và lấy thẳng các item trong dataset.
// actorId dùng dạng "owner~name" (vd "apidojo~tweet-scraper").
export async function runActorGetItems(
  actorId: string,
  input: Record<string, unknown>,
  token: string,
  fetchImpl: FetchImpl = fetch,
): Promise<unknown[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Apify actor ${actorId} thất bại: HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
