// Chuẩn hóa URL để CHỐNG BÀI TRÙNG: cùng một bài nhưng khác đuôi tracking
// (?utm_source=twitter, ?fbclid=..., #section) phải quy về MỘT url để dedupe đúng
// (external_id của báo chí là guid ?? url). Bỏ tham số theo dõi + fragment, hạ
// host về chữ thường, bỏ dấu "/" thừa cuối. Lỗi parse → trả nguyên bản.

// Tiền tố tham số theo dõi cần loại (utm_source, mc_cid, mkt_tok, _hsenc…).
const TRACKING_PREFIX = /^(utm_|mc_|mkt_|hsa_|_hs)/i;
// Tham số click-id cần loại (khớp CHÍNH XÁC tên).
const TRACKING_EXACT = new Set([
  'fbclid', 'gclid', 'gbraid', 'wbraid', 'dclid', 'msclkid', 'yclid', 'twclid',
  'igshid', 'ref', 'ref_src', 'cmpid', 'spm', 'mc_cid', 'mc_eid',
]);

export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    const kept = new URLSearchParams();
    for (const [k, v] of u.searchParams) {
      if (TRACKING_PREFIX.test(k) || TRACKING_EXACT.has(k.toLowerCase())) continue;
      kept.append(k, v);
    }
    u.search = kept.toString();
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    return u.toString();
  } catch {
    return raw;
  }
}
