import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from './client';
import { upsertPosts, refreshMetrics } from './posts';
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

describe('refreshMetrics', () => {
  function ytPost(externalId: string, views: number, publishedAt: string): NormalizedPost {
    return {
      sourceType: 'youtube',
      sourceName: 'Test YT Channel',
      externalId,
      title: 'Video thử nghiệm (đã dịch)',
      text: 'Original title',
      url: `https://example.com/yt-${externalId}`,
      author: null,
      publishedAt,
      lang: null,
      metrics: views > 0 ? { views } : {},
    };
  }
  const recent = new Date(Date.now() - 2 * 3600e3).toISOString();      // 2 giờ trước
  const old = new Date(Date.now() - 30 * 24 * 3600e3).toISOString();   // 30 ngày trước

  beforeAll(async () => {
    await client.from('posts').delete().like('url', 'https://example.com/yt-%');
    await client.from('sources').delete().eq('name', 'Test YT Channel');
    await upsertPosts(client, [ytPost('v1', 100, recent), ytPost('v2', 100, old)]);
  });

  afterAll(async () => {
    await client.from('posts').delete().like('url', 'https://example.com/yt-%');
    await client.from('sources').delete().eq('name', 'Test YT Channel');
  });

  it('cập nhật views cho bài trong cửa sổ, KHÔNG đụng title đã dịch, bỏ qua bài quá cũ', async () => {
    const n = await refreshMetrics(client, [ytPost('v1', 99999, recent), ytPost('v2', 99999, old)]);
    expect(n).toBe(1); // chỉ v1 (trong 7 ngày)

    const { data } = await client
      .from('posts')
      .select('external_id, title, metrics')
      .like('url', 'https://example.com/yt-%')
      .order('external_id');
    expect(data![0].metrics).toEqual({ views: 99999 });               // v1 tươi lại
    expect(data![0].title).toBe('Video thử nghiệm (đã dịch)');        // title không bị đè
    expect(data![1].metrics).toEqual({ views: 100 });                 // v2 quá cũ → giữ nguyên
  });

  it('bài không có metrics thì bỏ qua (không update rỗng)', async () => {
    const n = await refreshMetrics(client, [ytPost('v1', 0, recent)]);
    expect(n).toBe(0);
  });
});
