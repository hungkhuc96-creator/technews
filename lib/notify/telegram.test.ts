import { describe, it, expect, vi } from 'vitest';
import { sendTelegramMessage } from './telegram';

describe('sendTelegramMessage', () => {
  it('POST đúng endpoint + payload HTML, không lỗi khi ok:true', async () => {
    const fake = vi.fn(
      async (_u: string | URL | Request, _i?: RequestInit): Promise<Response> =>
        ({ json: async () => ({ ok: true }) }) as unknown as Response,
    );
    await sendTelegramMessage('TOK', '@kenh', '<b>hi</b>', fake);
    expect(fake).toHaveBeenCalledOnce();
    const [url, init] = fake.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/botTOK/sendMessage');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ chat_id: '@kenh', text: '<b>hi</b>', parse_mode: 'HTML' });
  });

  it('ném lỗi khi Telegram trả ok:false', async () => {
    const fake = vi.fn(
      async (_u: string | URL | Request, _i?: RequestInit): Promise<Response> =>
        ({ json: async () => ({ ok: false, description: 'chat not found' }) }) as unknown as Response,
    );
    await expect(sendTelegramMessage('TOK', 'x', 'y', fake)).rejects.toThrow('chat not found');
  });
});
