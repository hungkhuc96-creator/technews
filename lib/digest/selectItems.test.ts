import { describe, it, expect } from 'vitest';
import { sentRecently, selectDigestItems, type DigestCandidate } from './selectItems';

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

describe('sentRecently (chốt chặn gửi đúp)', () => {
  const now = new Date('2026-07-05T12:20:00Z');
  it('vừa gửi 20 phút trước → chặn (lịch dự phòng phải bỏ qua)', () => {
    expect(sentRecently('2026-07-05T12:00:00Z', now)).toBe(true);
  });
  it('bản gần nhất đã 5 tiếng (bản trưa sau bản sáng) → cho gửi', () => {
    expect(sentRecently('2026-07-05T07:00:00Z', now)).toBe(false);
  });
  it('chưa từng gửi → cho gửi', () => {
    expect(sentRecently(null, now)).toBe(false);
  });
});
