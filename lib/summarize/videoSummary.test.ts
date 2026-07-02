import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { upsertPosts } from '../db/posts';
import { buildVideoPrompt, cleanBullets, videoSummaryById } from './videoSummary';

describe('cleanBullets', () => {
  it('bỏ lời dẫn, chỉ giữ gạch đầu dòng', () => {
    expect(cleanBullets('Dưới đây là tóm tắt video:\n- Ý một\n- Ý hai')).toBe('- Ý một\n- Ý hai');
  });
  it('không có gạch đầu dòng thì giữ nguyên (format lạ)', () => {
    expect(cleanBullets('Một đoạn văn xuôi.')).toBe('Một đoạn văn xuôi.');
  });
});

describe('buildVideoPrompt', () => {
  it('yêu cầu tiếng Việt, gạch đầu dòng, bỏ quảng cáo, không suy diễn', () => {
    const p = buildVideoPrompt();
    expect(p).toContain('TIẾNG VIỆT');
    expect(p).toContain('gạch đầu dòng');
    expect(p).toContain('quảng cáo');
    expect(p).toContain('không suy diễn');
  });
});

describe('videoSummaryById', () => {
  const client = createServiceClient();
  let postId: string;
  const URL = 'https://www.youtube.com/watch?v=vidsum_test1';

  beforeAll(async () => {
    await client.from('posts').delete().like('url', '%vidsum_test%');
    await client.from('sources').delete().eq('name', 'VidSum-Src');
    await upsertPosts(client, [{
      sourceType: 'youtube', sourceName: 'VidSum-Src', externalId: 'vidsum_test1',
      title: 'Video thử', text: '', url: URL,
      author: null, publishedAt: '2026-07-01T00:00:00.000Z', lang: null, metrics: {},
    }]);
    const { data } = await client.from('posts').select('id').eq('url', URL).single();
    postId = data!.id;
  });

  afterAll(async () => {
    await client.from('posts').delete().like('url', '%vidsum_test%');
    await client.from('sources').delete().eq('name', 'VidSum-Src');
  });

  it('tạo ý chính, cache; lần 2 KHÔNG gọi Gemini nữa', async () => {
    let calls = 0;
    const fake = async (url: string) => {
      calls++;
      expect(url).toBe(URL); // Gemini nhận đúng link video
      return '- Ý một\n- Ý hai';
    };

    const first = await videoSummaryById(client, fake, postId);
    expect(first).toBe('- Ý một\n- Ý hai');
    expect(calls).toBe(1);

    const second = await videoSummaryById(client, fake, postId);
    expect(second).toBe(first); // từ cache
    expect(calls).toBe(1);      // không gọi lại
  }, 60000);

  it('post không tồn tại hoặc không phải youtube → null', async () => {
    expect(await videoSummaryById(client, async () => 'x', '00000000-0000-0000-0000-000000000000')).toBeNull();
  }, 60000);
});
