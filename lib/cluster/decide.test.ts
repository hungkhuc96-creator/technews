import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './similarity';
import { extractEntities } from '../enrich/entities';
import { bestCluster, type ClusterCandidate } from './decide';

describe('cosineSimilarity', () => {
  it('vector giống hệt = 1, vuông góc = 0', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe('extractEntities', () => {
  it('lấy tên riêng/sản phẩm, bỏ chữ thường thường', () => {
    const e = extractEntities('OpenAI ra mắt GPT-5.2');
    expect(e).toContain('openai');
    expect(e).toContain('gpt-5.2');
    expect(e).not.toContain('ra');
  });
  it('bỏ số trần và từ phổ biến viết hoa đầu câu', () => {
    const e = extractEntities('Apple chốt sự kiện iPhone 17');
    expect(e).toContain('apple');
    expect(e).toContain('iphone');
    expect(e).not.toContain('17');
  });
});

describe('bestCluster', () => {
  const candidates: ClusterCandidate[] = [
    { id: 'c-gpt', centroid: [1, 0, 0], entities: ['gpt-5.2', 'openai'] },
    { id: 'c-iphone', centroid: [0, 1, 0], entities: ['iphone', 'apple'] },
  ];

  it('nhập cụm khi đủ giống + trùng thực thể', () => {
    const r = bestCluster([0.98, 0.05, 0], ['gpt-5.2'], candidates);
    expect(r?.clusterId).toBe('c-gpt');
  });

  it('không nhập nếu không trùng thực thể (dù vector giống)', () => {
    const r = bestCluster([1, 0, 0], ['samsung'], candidates);
    expect(r).toBeNull();
  });

  it('không nhập nếu cosine dưới ngưỡng', () => {
    const r = bestCluster([0.3, 0.3, 0.9], ['gpt-5.2'], candidates);
    expect(r).toBeNull();
  });
});
