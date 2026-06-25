import OpenAI from 'openai';
import type { ChatFn } from './summarizeCluster';

export function createChat(): ChatFn {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) throw new Error('Thiếu GLM_API_KEY');
  const baseURL = process.env.GLM_BASE_URL ?? 'https://api.z.ai/api/paas/v4';
  const model = process.env.GLM_MODEL ?? 'glm-5.2';
  const client = new OpenAI({ apiKey, baseURL });
  return async (prompt: string) => {
    const res = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    return res.choices[0]?.message?.content ?? '';
  };
}
