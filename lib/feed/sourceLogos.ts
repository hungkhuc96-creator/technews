// Map tên nguồn báo → domain → logo (favicon). Dùng chung cho danh sách "Theo dõi"
// và avatar "số nguồn đưa tin" để ĐỒNG BỘ.
const DOMAINS: Record<string, string> = {
  'the verge': 'theverge.com',
  '9to5mac': '9to5mac.com',
  '9to5google': '9to5google.com',
  engadget: 'engadget.com',
  macrumors: 'macrumors.com',
  'android authority': 'androidauthority.com',
  gsmarena: 'gsmarena.com',
  techcrunch: 'techcrunch.com',
  'ars technica': 'arstechnica.com',
  arstechnica: 'arstechnica.com',
  "tom's hardware": 'tomshardware.com',
  tomshardware: 'tomshardware.com',
  'the information': 'theinformation.com',
  cnet: 'cnet.com',
  wccftech: 'wccftech.com',
  'windows central': 'windowscentral.com',
  wired: 'wired.com',
  bgr: 'bgr.com',
  macworld: 'macworld.com',
  notebookcheck: 'notebookcheck.net',
  androidpolice: 'androidpolice.com',
  gizmochina: 'gizmochina.com',
  'the next web': 'thenextweb.com',
  zdnet: 'zdnet.com',
  'digital trends': 'digitaltrends.com',
};

function norm(name: string): string {
  return name.toLowerCase().replace(/\.com$/, '').replace(/[^a-z0-9 ]/g, '').trim();
}

export function domainFor(name: string): string | null {
  return DOMAINS[norm(name)] ?? null;
}

function favicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

// URL logo (favicon 64px của Google). null nếu chưa biết domain → dùng chữ cái thay.
export function logoFor(name: string): string | null {
  const d = domainFor(name);
  return d ? favicon(d) : null;
}

// Logo nền tảng (cho YouTube/X/Reddit/TikTok khi không khớp được logo nguồn cụ thể).
const PLATFORM: Record<string, string> = {
  youtube: favicon('youtube.com'),
  x: favicon('x.com'),
  reddit: favicon('reddit.com'),
  tiktok: favicon('tiktok.com'),
};

// Logo hiển thị theo LOẠI nguồn:
// - báo chí → logo TRANG BÁO cụ thể (mỗi báo một logo)
// - YouTube/X/Reddit/TikTok → logo NỀN TẢNG (YouTube, X, Reddit…)
export function feedLogo(type: string, sourceName?: string | null): string {
  if (type === 'press') return logoFor(sourceName ?? '') ?? favicon('news.google.com');
  return PLATFORM[type] ?? favicon('news.google.com');
}
