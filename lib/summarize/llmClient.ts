import Anthropic from '@anthropic-ai/sdk';
import type { ChatFn } from './summarizeCluster';

// Client tóm tắt qua Claude (Anthropic SDK). ChatFn provider-neutral nên đổi nhà
// cung cấp chỉ là đổi file này.
export function createChat(): ChatFn {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Thiếu ANTHROPIC_API_KEY');
  const model = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5';
  const client = new Anthropic({ apiKey });
  return async (prompt: string) => {
    const res = await client.messages.create({
      model,
      max_tokens: 1024,
      // Toàn bộ tác vụ là factual (dịch/tóm tắt/so khớp) → temperature thấp cho
      // ổn định, ít "sáng tác".
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
  };
}
