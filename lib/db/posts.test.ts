import { describe, it, expect, beforeAll } from 'vitest';
import { createServiceClient } from './client';
import { upsertPosts } from './posts';
import type { NormalizedPost } from '../types';

const client = createServiceClient();

function makePost(externalId: string): NormalizedPost {
  return {
    sourceType: 'press',
    sourceName: 'Test Source',
    externalId,
    title: 'Tin thử nghiệm',
    text: 'noi dung',
    url: `https://example.com/${externalId}`,
    author: null,
    publishedAt: '2026-06-24T00:00:00.000Z',
    lang: null,
    metrics: {},
  };
}

describe('upsertPosts', () => {
  beforeAll(async () => {
    // dọn dữ liệu test cũ (nếu lần chạy trước còn sót)
    await client.from('posts').delete().like('url', 'https://example.com/%');
    await client.from('sources').delete().eq('name', 'Test Source');
  });

  it('ghi post mới và trả về số dòng ghi', async () => {
    const n = await upsertPosts(client, [makePost('a1'), makePost('a2')]);
    expect(n).toBe(2);
    const { count } = await client
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .like('url', 'https://example.com/%');
    expect(count).toBe(2);
  });

  it('không tạo trùng khi external_id đã tồn tại', async () => {
    await upsertPosts(client, [makePost('a1'), makePost('a3')]);
    const { count } = await client
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .like('url', 'https://example.com/%');
    expect(count).toBe(3); // a1,a2,a3 — a1 không nhân đôi
  });
});
