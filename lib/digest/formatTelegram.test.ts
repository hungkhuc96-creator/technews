import { describe, it, expect } from 'vitest';
import { formatDigest, escapeHtml, type DigestItem } from './formatTelegram';

describe('escapeHtml', () => {
  it('escape & < > "', () => {
    expect(escapeHtml('A & B <c> "d"')).toBe('A &amp; B &lt;c&gt; &quot;d&quot;');
  });
});

describe('formatDigest', () => {
  const items: DigestItem[] = [
    { titleVi: 'Apple ra mắt M5', summary: 'Chip mới nhanh hơn 20%.', url: 'https://x.com/tin/a' },
    { titleVi: 'Google & EU', summary: 'Án phạt lớn.', url: 'https://x.com/tin/b' },
  ];

  it('có tiêu đề ngày, đánh số, link bọc tiêu đề, và dòng chân', () => {
    const out = formatDigest({ date: '03/07', host: 'https://x.com', items });
    expect(out).toContain('peek — Bản tin công nghệ · 03/07');
    expect(out).toContain('1. <a href="https://x.com/tin/a"><b>Apple ra mắt M5</b></a>');
    expect(out).toContain('2. <a href="https://x.com/tin/b"><b>Google &amp; EU</b></a>');
    expect(out).toContain('Chip mới nhanh hơn 20%.');
    expect(out).toContain('👉 Liếc thêm tại peek: https://x.com');
  });

  it('escape ký tự đặc biệt trong tiêu đề để không vỡ HTML', () => {
    const out = formatDigest({
      date: '03/07', host: 'https://x.com',
      items: [{ titleVi: '5 < 10 & "an toàn"', summary: '', url: 'https://x.com/tin/c' }],
    });
    expect(out).toContain('5 &lt; 10 &amp; &quot;an toàn&quot;');
    expect(out).not.toContain('<b>5 < 10'); // dấu < thô không được lọt ra
  });

  it('rút gọn ý chính quá dài (thêm dấu …)', () => {
    const long = 'x'.repeat(300);
    const out = formatDigest({
      date: '03/07', host: 'https://x.com',
      items: [{ titleVi: 'T', summary: long, url: 'https://x.com/tin/d' }],
    });
    expect(out).toContain('…');
    expect(out).not.toContain('x'.repeat(300));
  });
});
