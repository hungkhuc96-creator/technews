import { describe, it, expect } from 'vitest';
import { looksLikeRefusal, safeTranslated } from './translateSafety';

describe('looksLikeRefusal', () => {
  it('bắt câu từ chối/hỏi lại của AI (case thật B8/Q8/emoji)', () => {
    expect(looksLikeRefusal('Tôi không thể dịch được vì tweet chỉ chứa "B8" - đây không phải là một câu hoàn chỉnh.')).toBe(true);
    expect(looksLikeRefusal('Tôi không thấy tweet nào trong tin nhắn của bạn. Bạn có thể cung cấp nội dung?')).toBe(true);
    expect(looksLikeRefusal('Tôi sẵn sàng dịch, nhưng tweet bạn chỉ chứa các lá cờ Mỹ.')).toBe(true);
    expect(looksLikeRefusal('Bạn có thể cung cấp toàn bộ nội dung tweet để tôi dịch?')).toBe(true);
  });

  it('KHÔNG bắt nhầm tiêu đề dịch thật (kể cả có "bạn có thể"/"cung cấp")', () => {
    expect(looksLikeRefusal('Grok cung cấp tính năng mới cho người dùng')).toBe(false);
    expect(looksLikeRefusal('Bạn có thể tạo Video Overviews dạng dọc 60 giây')).toBe(false);
    expect(looksLikeRefusal('iPhone của bạn có thể nhìn thấy phía sau đầu bạn không?')).toBe(false);
    expect(looksLikeRefusal('Apple phát hành macOS 27 public beta')).toBe(false);
  });
});

describe('safeTranslated', () => {
  it('câu từ chối → giữ nguyên bản gốc', () => {
    expect(safeTranslated('Tôi không thể dịch được vì tweet chỉ chứa "B8"', 'B8')).toBe('B8');
  });
  it('rỗng → giữ nguyên bản gốc', () => {
    expect(safeTranslated('', 'iPhone 18 leak')).toBe('iPhone 18 leak');
    expect(safeTranslated(null, 'iPhone 18 leak')).toBe('iPhone 18 leak');
  });
  it('bản dịch hợp lệ → trả bản dịch (đã trim)', () => {
    expect(safeTranslated('  iPhone 18 rò rỉ  ', 'iPhone 18 leak')).toBe('iPhone 18 rò rỉ');
  });
});
