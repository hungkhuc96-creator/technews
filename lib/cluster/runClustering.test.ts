import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '../db/client';
import { upsertPosts } from '../db/posts';
import { runClustering } from './runClustering';
import type { NormalizedPost } from '../types';

const client = createServiceClient();

// Embed giả: 3 chiều, gần như vuông góc theo chủ đề → xác định.
const VEC: Record<string, number[]> = {
  gpt: [1, 0, 0],
  iphone: [0, 1, 0],
};
const fakeEmbed = async (text: string): Promise<number[]> => {
  if (text.toLowerCase().includes('gpt')) return VEC.gpt;
  if (text.toLowerCase().includes('iphone')) return VEC.iphone;
  return [0, 0, 1];
};

function post(source: string, externalId: string, title: string): NormalizedPost {
  return {
    sourceType: 'press', sourceName: source, externalId,
    title, text: title, url: `https://example.com/${externalId}`,
    author: null, publishedAt: '2026-06-24T00:00:00.000Z', lang: null, metrics: {},
  };
}

describe('runClustering', () => {
  beforeAll(async () => {
    // dọn dữ liệu test cũ (kể cả cụm mà lần chạy trước đã tạo)
    const { data: old } = await client
      .from('posts').select('cluster_id').like('url', 'https://example.com/%');
    const oldClusterIds = [...new Set((old ?? []).map((p) => p.cluster_id).filter(Boolean))];
    await client.from('posts').delete().like('url', 'https://example.com/%');
    if (oldClusterIds.length) await client.from('clusters').delete().in('id', oldClusterIds);
    await client.from('sources').delete().like('name', 'T-%');
    // nạp 3 post: 2 tin GPT từ 2 nguồn khác nhau, 1 tin iPhone
    await upsertPosts(client, [
      post('T-A', 'g1', 'OpenAI releases GPT-5.2'),
      post('T-B', 'g2', 'GPT-5.2 benchmark leak from Nvidia'),
      post('T-A', 'p1', 'Apple sets iPhone 17 event'),
    ]);
  });

  afterAll(async () => {
    const { data } = await client
      .from('posts').select('cluster_id').like('url', 'https://example.com/%');
    const ids = [...new Set((data ?? []).map((p) => p.cluster_id).filter(Boolean))];
    await client.from('posts').delete().like('url', 'https://example.com/%');
    if (ids.length) await client.from('clusters').delete().in('id', ids);
    await client.from('sources').delete().like('name', 'T-%');
  });

  it('gom 2 tin GPT thành 1 cụm (2 nguồn), iPhone thành cụm riêng', async () => {
    const res = await runClustering(client, { embed: fakeEmbed }, {
      urlPrefix: 'https://example.com/',
    });
    expect(res.processed).toBe(3);

    const { data: posts } = await client
      .from('posts')
      .select('external_id, cluster_id')
      .like('url', 'https://example.com/%');
    const byId = Object.fromEntries(posts!.map((p) => [p.external_id, p.cluster_id]));

    expect(byId.g1).toBe(byId.g2);     // 2 tin GPT cùng cụm
    expect(byId.p1).not.toBe(byId.g1); // iPhone khác cụm

    const { data: gptCluster } = await client
      .from('clusters').select('n_sources, post_count, entities').eq('id', byId.g1).single();
    expect(gptCluster!.n_sources).toBe(2);  // 2 nguồn (T-A, T-B)
    expect(gptCluster!.post_count).toBe(2);
    // Từ khóa cụm ĐÔNG CỨNG theo bài đầu — không nuốt thêm "nvidia" từ bài thứ 2.
    expect(gptCluster!.entities).toContain('gpt-5.2');
    expect(gptCluster!.entities).not.toContain('nvidia');
  }, 60000); // nhiều lượt gọi DB qua mạng nên cho thời gian rộng
});

describe('runClustering — chốt chặn AI (sameEvent)', () => {
  beforeAll(async () => {
    const { data: old } = await client
      .from('posts').select('cluster_id').like('url', 'https://gate.example/%');
    const oldIds = [...new Set((old ?? []).map((p) => p.cluster_id).filter(Boolean))];
    await client.from('posts').delete().like('url', 'https://gate.example/%');
    if (oldIds.length) await client.from('clusters').delete().in('id', oldIds);
    await client.from('sources').delete().like('name', 'G-%');
    // 2 tin embedding GIỐNG HỆT (cosine 1.0) → embedding sẽ đề cử gộp.
    await upsertPosts(client, [
      { sourceType: 'press', sourceName: 'G-A', externalId: 'x1', title: 'OpenAI ships GPT-6',
        text: 'gpt', url: 'https://gate.example/x1', author: null,
        publishedAt: '2026-06-24T00:00:00.000Z', lang: null, metrics: {} },
      { sourceType: 'press', sourceName: 'G-B', externalId: 'x2', title: 'GPT-6 sales collapse',
        text: 'gpt', url: 'https://gate.example/x2', author: null,
        publishedAt: '2026-06-24T01:00:00.000Z', lang: null, metrics: {} },
    ]);
  });

  afterAll(async () => {
    const { data } = await client
      .from('posts').select('cluster_id').like('url', 'https://gate.example/%');
    const ids = [...new Set((data ?? []).map((p) => p.cluster_id).filter(Boolean))];
    await client.from('posts').delete().like('url', 'https://gate.example/%');
    if (ids.length) await client.from('clusters').delete().in('id', ids);
    await client.from('sources').delete().like('name', 'G-%');
  });

  it('AI nói "không cùng sự kiện" → KHÔNG gộp dù embedding giống hệt', async () => {
    const fakeEmbedSame = async () => [1, 0, 0]; // mọi tin → cùng vector
    const sameEvent = async () => false;          // AI luôn từ chối gộp
    await runClustering(client, { embed: fakeEmbedSame, sameEvent }, {
      urlPrefix: 'https://gate.example/',
    });
    const { data: posts } = await client
      .from('posts').select('external_id, cluster_id').like('url', 'https://gate.example/%');
    const byId = Object.fromEntries(posts!.map((p) => [p.external_id, p.cluster_id]));
    expect(byId.x1).not.toBe(byId.x2); // bị tách thành 2 cụm riêng
  }, 60000);
});
