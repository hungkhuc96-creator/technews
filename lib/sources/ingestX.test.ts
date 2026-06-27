import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ingestX } from './ingestX';
import type { NormalizedPost } from '../types';

const items = JSON.parse(
  readFileSync(fileURLToPath(new URL('./__fixtures__/x.json', import.meta.url)), 'utf-8'),
);

describe('ingestX', () => {
  it('gọi actor với handles + maxItems, chuẩn hóa rồi upsert', async () => {
    let seenInput: any = null;
    const inserted: NormalizedPost[] = [];
    const result = await ingestX(['MKBHD', 'verge', 'sama'], {
      runActor: async (input) => { seenInput = input; return items; },
      upsert: async (p) => { inserted.push(...p); return p.length; },
      maxItems: 30,
    });
    expect(seenInput.twitterHandles).toEqual(['MKBHD', 'verge', 'sama']);
    expect(seenInput.maxItems).toBe(30);
    expect(seenInput.sort).toBe('Latest');
    expect(result.fetched).toBe(1);   // 3 item nhưng chỉ 1 tweet gốc
    expect(result.inserted).toBe(1);
    expect(inserted[0].sourceType).toBe('x');
  });

  it('actor lỗi thì trả inserted 0 và ghi nhận lỗi (không ném)', async () => {
    const result = await ingestX(['x'], {
      runActor: async () => { throw new Error('Apify down'); },
      upsert: async (p) => p.length,
    });
    expect(result.inserted).toBe(0);
    expect(result.error).toMatch(/Apify down/);
  });
});
