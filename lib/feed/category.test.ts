import { describe, it, expect } from 'vitest';
import { matchCategory } from './category';

describe('matchCategory', () => {
  it('"Tất cả" luôn khớp', () => {
    expect(matchCategory('bất kỳ tiêu đề nào', 'Tất cả')).toBe(true);
  });

  it('khớp AI khi có từ khoá AI thật', () => {
    expect(matchCategory('OpenAI công bố GPT-5.6', 'AI')).toBe(true);
    expect(matchCategory('iOS 27 tích hợp AI Siri', 'AI')).toBe(true);
  });

  it('KHÔNG khớp AI nhầm vì chữ "hai"/"tài" chứa "ai"', () => {
    expect(matchCategory('Microsoft tăng giá Xbox lần thứ hai', 'AI')).toBe(false);
    expect(matchCategory('Tài liệu rò rỉ về camera', 'AI')).toBe(false);
  });

  it('khớp Apple/Game theo từ khoá', () => {
    expect(matchCategory('Đánh giá nhanh MacBook Pro M5', 'Apple')).toBe(true);
    expect(matchCategory('Valve công bố Steam Machine', 'Game')).toBe(true);
  });
});
