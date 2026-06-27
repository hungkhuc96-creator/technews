import { describe, it, expect } from 'vitest';
import { runActorGetItems } from './apifyClient';

describe('runActorGetItems', () => {
  it('POST đúng endpoint run-sync-get-dataset-items kèm token + input, trả mảng item', async () => {
    let seenUrl = '';
    let seenBody = '';
    const fakeFetch = (async (url: string, init: RequestInit) => {
      seenUrl = url;
      seenBody = String(init.body ?? '');
      return new Response(JSON.stringify([{ id: '1' }, { id: '2' }]), { status: 200 });
    }) as unknown as typeof fetch;

    const items = await runActorGetItems('apidojo~tweet-scraper', { maxItems: 5 }, 'TKN', fakeFetch);
    expect(items).toHaveLength(2);
    expect(seenUrl).toContain('/acts/apidojo~tweet-scraper/run-sync-get-dataset-items');
    expect(seenUrl).toContain('token=TKN');
    expect(seenBody).toContain('"maxItems":5');
  });

  it('lỗi HTTP thì ném lỗi rõ', async () => {
    const failFetch = (async () => new Response('nope', { status: 402 })) as unknown as typeof fetch;
    await expect(runActorGetItems('a~b', {}, 'T', failFetch)).rejects.toThrow(/402/);
  });
});
