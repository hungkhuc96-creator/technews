export interface DigestItem {
  titleVi: string;
  summary: string;
  url: string;
}

// Telegram parse_mode=HTML chỉ cho vài thẻ; nội dung chữ PHẢI escape & < > (và " trong
// thuộc tính href). Không escape là tin nhắn hỏng hoặc lỗi "can't parse entities".
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Rút gọn ý chính về ~max ký tự, cắt ở khoảng trắng gần nhất để không đứt giữa từ.
function clampSummary(s: string, max = 180): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + '…';
}

// Soạn 1 bản tin Telegram (HTML). THUẦN: không đụng DB/mạng → dễ test.
export function formatDigest(opts: {
  date: string; // vd "03/07"
  host: string; // vd "https://technews-rho-three.vercel.app"
  items: DigestItem[];
}): string {
  const lines: string[] = [`🔥 <b>peek — Bản tin công nghệ · ${escapeHtml(opts.date)}</b>`, ''];
  opts.items.forEach((it, i) => {
    const title = escapeHtml(it.titleVi.trim());
    lines.push(`${i + 1}. <a href="${escapeHtml(it.url)}"><b>${title}</b></a>`);
    if (it.summary.trim()) lines.push(escapeHtml(clampSummary(it.summary)));
    lines.push('');
  });
  lines.push(`👉 Liếc thêm tại peek: ${escapeHtml(opts.host)}`);
  return lines.join('\n');
}
