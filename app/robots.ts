import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Sinh /robots.txt — cho phép mọi crawler (kể cả AI: site sống nhờ được nhắc
// tới, chặn AI là tự ẩn mình) + chỉ đường tới sitemap để Google tự tìm thấy.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
