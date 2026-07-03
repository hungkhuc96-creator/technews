import { describe, it, expect } from 'vitest';
import { selectDigestItems, type DigestCandidate } from './selectItems';

const c = (id: string, titleVi: string | null = 'Tiêu đề'): DigestCandidate => ({
  clusterId: id, titleVi, summary: 'ý chính',
});

describe('selectDigestItems', () => {
  it('lấy top N theo thứ tự đầu vào (heat cao trước)', () => {
    const r = selectDigestItems([c('a'), c('b'), c('c')], new Set(), 2);
    expect(r.map((x) => x.clusterId)).toEqual(['a', 'b']);
  });

  it('bỏ cụm đã gửi gần đây', () => {
    const r = selectDigestItems([c('a'), c('b'), c('c')], new Set(['a']), 5);
    expect(r.map((x) => x.clusterId)).toEqual(['b', 'c']);
  });

  it('bỏ cụm thiếu tiêu đề tiếng Việt', () => {
    const r = selectDigestItems([c('a', null), c('b', '  '), c('c')], new Set(), 5);
    expect(r.map((x) => x.clusterId)).toEqual(['c']);
  });

  it('trả rỗng khi không còn cụm hợp lệ', () => {
    expect(selectDigestItems([c('a')], new Set(['a']), 5)).toEqual([]);
  });
});
