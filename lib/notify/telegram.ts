// Gửi 1 tin nhắn vào kênh/chat Telegram qua Bot API.
// Token là secret → truyền vào, KHÔNG hardcode. `fetchImpl` để test bằng fetch giả.
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  html: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const data = (await res.json()) as { ok?: boolean; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram gửi lỗi: ${data.description ?? res.status}`);
  }
}
