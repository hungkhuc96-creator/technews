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
    expect(seenInput.searchTerms[0]).toContain('from:MKBHD');
    expect(seenInput.searchTerms[0]).toContain('from:verge');
    expect(seenInput.searchTerms[0]).toContain('-filter:retweets');
    expect(seenInput.maxItems).toBe(30);
    expect(seenInput.sort).toBe('Latest');
    expect(result.fetched).toBe(1);   // 3 item nhưng chỉ 1 tweet gốc
    expect(result.inserted).toBe(1);
    expect(inserted[0].sourceType).toBe('x');
  });

  it('nhiều handle → chia thành nhiều query, mỗi query dưới giới hạn 512 ký tự của X', async () => {
    // 37 handle dài nhất có thể (15 ký tự) — trường hợp xấu nhất
    const handles = Array.from({ length: 37 }, (_, i) => `handle_dai_${String(i).padStart(4, '0')}`);
    let seenInput: any = null;
    await ingestX(handles, {
      runActor: async (input) => { seenInput = input; return []; },
      upsert: async (p) => p.length,
    });
    expect(seenInput.searchTerms.length).toBe(3); // 15+15+7
    for (const q of seenInput.searchTerms) {
      expect(q.length).toBeLessThanOrEqual(512);
      expect(q).toContain('-filter:retweets');
    }
    // không rơi rớt handle nào
    const joined = seenInput.searchTerms.join(' ');
    for (const h of handles) expect(joined).toContain(`from:${h}`);
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
