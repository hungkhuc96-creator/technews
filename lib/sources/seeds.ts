import type { PressSource } from './press';

export const PRESS_SOURCES: PressSource[] = [
  { name: 'The Verge', feedUrl: 'https://www.theverge.com/rss/index.xml' },
  { name: 'TechCrunch', feedUrl: 'https://techcrunch.com/feed/' },
  { name: 'Engadget', feedUrl: 'https://www.engadget.com/rss.xml' },
  { name: '9to5Mac', feedUrl: 'https://9to5mac.com/feed/' },
  { name: '9to5Google', feedUrl: 'https://9to5google.com/feed/' },
  { name: 'MacRumors', feedUrl: 'https://feeds.macrumors.com/MacRumors-All' },
  { name: 'Android Authority', feedUrl: 'https://www.androidauthority.com/feed/' },
  { name: 'Ars Technica', feedUrl: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: "Tom's Hardware", feedUrl: 'https://www.tomshardware.com/feeds/all' },
  { name: 'Windows Central', feedUrl: 'https://www.windowscentral.com/rss' },
  { name: 'CNET', feedUrl: 'https://www.cnet.com/rss/news/' },
  { name: 'AndroidPolice', feedUrl: 'https://www.androidpolice.com/feed/' },
];
// Ghi chú: URL RSS có thể đổi — kiểm tra lại từng feed khi chạy thật.
