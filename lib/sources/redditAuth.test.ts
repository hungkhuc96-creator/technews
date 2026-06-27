import { describe, it, expect } from 'vitest';
import { getAppToken } from './redditAuth';

describe('getAppToken', () => {
  it('gửi Basic auth + grant client_credentials, trả access_token', async () => {
    let seenAuth = '';
    let seenBody = '';
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      seenAuth = (init.headers as Record<string, string>).authorization ?? '';
      seenBody = String(init.body ?? '');
      return new Response(JSON.stringify({ access_token: 'TOK123', expires_in: 86400 }), { status: 200 });
    }) as unknown as typeof fetch;

    const token = await getAppToken('myid', 'mysecret', fakeFetch);
    expect(token).toBe('TOK123');
    // Basic base64("myid:mysecret")
    expect(seenAuth).toBe('Basic ' + Buffer.from('myid:mysecret').toString('base64'));
    expect(seenBody).toContain('grant_type=client_credentials');
  });

  it('lỗi HTTP thì ném lỗi rõ ràng', async () => {
    const failFetch = (async () => new Response('bad', { status: 401 })) as unknown as typeof fetch;
    await expect(getAppToken('x', 'y', failFetch)).rejects.toThrow(/401/);
  });
});
