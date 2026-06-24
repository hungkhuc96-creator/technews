import { describe, it, expect } from 'vitest';
import { embedText } from './embed';

describe('embedText', () => {
  it('trả vector 384 chiều, đã chuẩn hóa (norm ≈ 1)', async () => {
    const v = await embedText('OpenAI launches GPT-5.2');
    expect(v).toHaveLength(384);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 1);
  }, 180000); // lần đầu phải tải model (~100MB) nên cho thời gian rộng
});
