import { describe, it, expect } from 'vitest';
import { pressHeat, engagementHeat, recencyHeat } from './heat';

describe('pressHeat', () => {
  it('cơ bản = √n_sources / (age + 2)^1.5', () => {
    expect(pressHeat(9, 0)).toBeCloseTo(3 / Math.pow(2, 1.5), 4);
  });

  it('cùng số nguồn, tin cũ hơn thì nóng thấp hơn', () => {
    expect(pressHeat(5, 0)).toBeGreaterThan(pressHeat(5, 10));
  });

  it('cùng tuổi, nhiều nguồn hơn thì nóng cao hơn (điểm cộng độ phủ)', () => {
    expect(pressHeat(10, 5)).toBeGreaterThan(pressHeat(2, 5));
  });

  it('ƯU TIÊN ĐỘ MỚI: tin mới 1 nguồn vượt tin cũ (2 ngày) dù 7 nguồn', () => {
    expect(pressHeat(1, 0)).toBeGreaterThan(pressHeat(7, 48));
  });

  it('TỐC ĐỘ lan truyền: 5 nguồn dồn trong 12h nóng hơn hẳn 5 nguồn rải rác', () => {
    expect(pressHeat(5, 6, { newSources12h: 5 })).toBeGreaterThan(pressHeat(5, 6) * 3);
  });

  it('bài LẺ 1 nguồn mới đăng KHÔNG được cộng điểm tốc độ (tự đếm chính nó)', () => {
    expect(pressHeat(1, 0, { newSources12h: 1 })).toBeCloseTo(pressHeat(1, 0), 6);
  });

  it('nguồn tier-1 được cộng điểm tin cậy', () => {
    expect(pressHeat(2, 5, { hasTier1: true })).toBeGreaterThan(pressHeat(2, 5));
  });

  it('CHỐNG HỒI MÁU (case Sony thật): tin 2.5 ngày có báo đăng lại KHÔNG vượt tin mới', () => {
    // Cụm Sony: 11 nguồn, bài mới nhất 0.2h (báo đăng lại), tin gốc 59h trước.
    // Từng chiếm "Nóng nhất" vì tuổi tính theo bài mới nhất. Nay tuổi trộn 30%
    // tuổi cụm → phải THUA một tin mới bình thường (1h, 2 nguồn).
    const sonyStale = pressHeat(11, 0.2, { newSources12h: 2, hasTier1: true, firstSeenAgeHours: 59 });
    const freshNews = pressHeat(2, 1, { newSources12h: 2, firstSeenAgeHours: 1 });
    expect(sonyStale).toBeLessThan(freshNews);
  });

  it('tuổi trộn: 70% tuổi bài mới nhất + 30% tuổi cụm (không có firstSeen → chỉ tuổi bài)', () => {
    // firstSeenAgeHours=100 (>72h) còn dính thêm phạt necro ×0.5
    expect(pressHeat(5, 1, { firstSeenAgeHours: 100 })).toBeCloseTo(
      (Math.sqrt(5) / Math.pow(0.7 * 1 + 0.3 * 100 + 2, 1.5)) * 0.5, 6);
    // không truyền firstSeen → tuổi = tuổi bài mới nhất như cũ
    expect(pressHeat(9, 0)).toBeCloseTo(3 / Math.pow(2, 1.5), 6);
  });

  it('tin đang diễn biến THẬT (nhiều nguồn dồn dập) vẫn giữ được độ nóng hợp lý', () => {
    // Sự kiện lớn 24h tuổi, bài mới 1h, 8 nguồn trong đó 4 nguồn trong 12h qua
    // → vẫn phải nóng hơn hẳn tin lẻ 1 nguồn cùng giờ.
    const developing = pressHeat(8, 1, { newSources12h: 4, hasTier1: true, firstSeenAgeHours: 24 });
    const single = pressHeat(1, 1, { firstSeenAgeHours: 1 });
    expect(developing).toBeGreaterThan(single);
  });

  it('tin thuần Mỹ bị nhân 0.4', () => {
    expect(pressHeat(4, 3, { usOnly: true })).toBeCloseTo(pressHeat(4, 3) * 0.4, 6);
  });
});

describe('engagementHeat', () => {
  it('= log10(1 + metric) / (age + 2)^1.5', () => {
    expect(engagementHeat(999, 0)).toBeCloseTo(Math.log10(1000) / Math.pow(2, 1.5), 5);
  });
  it('nhiều engagement hơn → nóng hơn (cùng tuổi)', () => {
    expect(engagementHeat(10000, 5)).toBeGreaterThan(engagementHeat(100, 5));
  });
  it('cũ hơn → nguội hơn', () => {
    expect(engagementHeat(1000, 0)).toBeGreaterThan(engagementHeat(1000, 20));
  });
});

describe('recencyHeat', () => {
  it('= 1 / (age + 2)^1.5; mới hơn nóng hơn', () => {
    expect(recencyHeat(0)).toBeCloseTo(1 / Math.pow(2, 1.5), 5);
    expect(recencyHeat(0)).toBeGreaterThan(recencyHeat(10));
  });
});
