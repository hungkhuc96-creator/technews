import type { PressSource } from './press';

// ĐẦY ĐỦ danh mục báo theo spec §12.1 — không rút gọn.
export const PRESS_SOURCES: PressSource[] = [
  { name: 'NotebookCheck', feedUrl: 'https://www.notebookcheck.net/News.152.100.html' },
  { name: '9to5Google', feedUrl: 'https://9to5google.com/feed/' },
  { name: '9to5Mac', feedUrl: 'https://9to5mac.com/feed/' },
  { name: 'Engadget', feedUrl: 'https://www.engadget.com/rss.xml' },
  { name: 'MacRumors', feedUrl: 'https://feeds.macrumors.com/MacRumors-All' },
  { name: 'Android Authority', feedUrl: 'https://www.androidauthority.com/feed/' },
  // GSMArena: Cloudflare chặn bot khá gắt — có thể lỗi 403 tùy máy chạy; orchestrator sẽ bỏ qua nếu lỗi.
  { name: 'GSMArena', feedUrl: 'https://www.gsmarena.com/rss-news-reviews.php3' },
  { name: 'The Verge', feedUrl: 'https://www.theverge.com/rss/index.xml' },
  { name: 'CNET', feedUrl: 'https://www.cnet.com/rss/news/' },
  { name: 'BGR', feedUrl: 'https://bgr.com/feed/' },
  { name: 'Macworld', feedUrl: 'https://www.macworld.com/feed' },
  { name: 'TechCrunch', feedUrl: 'https://techcrunch.com/feed/' },
  { name: 'WCCFTech', feedUrl: 'https://wccftech.com/feed/' },
  { name: 'Gizmochina', feedUrl: 'https://www.gizmochina.com/feed/' },
  { name: 'Windows Central', feedUrl: 'https://www.windowscentral.com/rss' },
  { name: "Tom's Hardware", feedUrl: 'https://www.tomshardware.com/feeds/all' },
  { name: 'Ars Technica', feedUrl: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'AndroidPolice', feedUrl: 'https://www.androidpolice.com/feed/' },
  { name: 'Wired', feedUrl: 'https://www.wired.com/feed/rss' },
  { name: 'The Information', feedUrl: 'https://www.theinformation.com/feed' },
];
// Ghi chú: URL RSS có thể đổi — kiểm tra lại từng feed khi chạy thật.
