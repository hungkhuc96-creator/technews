// Client Gemini tối giản cho tính năng "Ý chính video": Gemini là AI duy nhất
// XEM được video YouTube trực tiếp từ URL (API chính thức — không lách phụ đề).
// Chỉ dùng cho video; mọi tóm tắt chữ khác vẫn đi qua Claude (llmClient).

export type VideoChatFn = (videoUrl: string, prompt: string) => Promise<string>;

const MODEL = 'gemini-2.5-flash';

export function createVideoChat(fetchImpl: typeof fetch = fetch): VideoChatFn {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Thiếu GEMINI_API_KEY trong .env.local');

  return async (videoUrl: string, prompt: string): Promise<string> => {
    const res = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { file_data: { file_uri: videoUrl } }, // Gemini tự xem video YouTube
                { text: prompt },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
        }),
      },
    );
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`Gemini lỗi HTTP ${res.status}: ${detail}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim();
  };
}
