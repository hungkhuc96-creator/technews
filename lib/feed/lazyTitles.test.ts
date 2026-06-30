import { describe, it, expect } from 'vitest';
import { fillMissingTitles } from './lazyTitles';
import type { FeedItem } from './getFeed';

// Client giả: ghi lại các upsert, không đụng DB.
function fakeClient() {
  const upserts: any[] = [];
  return {
    upserts,
    from() {
      return { upsert: async (row: any) => { upserts.push(row); return {}; } };
    },
  } as any;
}

function press(clusterId: string, title: string, titleVi: string | null): FeedItem {
  return {
    clusterId, title, url: '', sourceName: 'X', publishedAt: '', updatedAt: null,
    nSources: 1, sources: [], authorName: null, metrics: {}, text: null,
    sourceTypes: ['press'], heat: 1, titleVi, imageUrl: null, summary: null, bullets: [],
  };
}

describe('fillMissingTitles', () => {
  it('dịch các tin báo chưa có titleVi, giữ nguyên cái đã có', async () => {
    const client = fakeClient();
    const items = [
      press('c1', 'Apple launches M5', null),
      press('c2', 'Already done', 'Đã dịch rồi'),
    ];
    const translate = async (ts: string[]) => ts.map((t) => `VI:${t}`);
    const out = await fillMissingTitles(client, translate, items);
    expect(out[0].titleVi).toBe('VI:Apple launches M5'); // được dịch
    expect(out[1].titleVi).toBe('Đã dịch rồi');           // giữ nguyên
    expect(client.upserts).toHaveLength(1);               // chỉ lưu cái mới dịch
    expect(client.upserts[0].cluster_id).toBe('c1');
  });

  it('không gọi/đổi gì khi mọi tin đã có titleVi', async () => {
    const client = fakeClient();
    let called = false;
    const items = [press('c1', 'a', 'A'), press('c2', 'b', 'B')];
    const out = await fillMissingTitles(client, async (t) => { called = true; return t; }, items);
    expect(called).toBe(false);
    expect(out).toEqual(items);
  });

  it('bỏ qua tin KHÔNG phải báo chí', async () => {
    const client = fakeClient();
    const yt: FeedItem = { ...press('p1', 'video', null), sourceTypes: ['youtube'] };
    const out = await fillMissingTitles(client, async (t) => t.map((x) => `VI:${x}`), [yt]);
    expect(out[0].titleVi).toBeNull();
    expect(client.upserts).toHaveLength(0);
  });
});
