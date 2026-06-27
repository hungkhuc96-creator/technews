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

// URL logo (favicon 64px của Google). null nếu chưa biết domain → dùng chữ cái thay.
export function logoFor(name: string): string | null {
  const d = domainFor(name);
  return d ? `https://www.google.com/s2/favicons?domain=${d}&sz=64` : null;
}
