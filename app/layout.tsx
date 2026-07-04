import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat, Space_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SITE_URL } from '@/lib/site';
import { siteJsonLd } from '@/lib/seo/jsonld';
import { SiteFooter } from '@/components/SiteFooter';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk' });
// Montserrat 800 CHỈ dùng cho wordmark "peek" (logo) — nội dung vẫn Inter/Grotesk.
const montserrat = Montserrat({ subsets: ['latin'], weight: '800', variable: '--font-montserrat' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), // gốc cho og:url / og:image tương đối
  title: 'peek — Feed tin công nghệ',
  description: 'Liếc phát biết — tin công nghệ nóng nhất, tóm tắt tiếng Việt.',
  // Mặc định toàn site cho thẻ chia sẻ (Facebook/Zalo/Telegram) + Twitter card.
  // Ảnh og lấy tự động từ app/opengraph-image.tsx; trang /tin/ tự override.
  openGraph: {
    siteName: 'peek',
    type: 'website',
    locale: 'vi_VN',
    title: 'peek — Feed tin công nghệ',
    description: 'Liếc phát biết — tin công nghệ nóng nhất, tóm tắt tiếng Việt.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

// theme-color: thanh trình duyệt (mobile) tiệp màu nền tối của app.
export const viewport: Viewport = { themeColor: '#0B0B0F' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${grotesk.variable} ${montserrat.variable}`}>
      <body>
        {/* JSON-LD định danh "peek" (WebSite + NewsMediaOrganization) cho Google/AI */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
