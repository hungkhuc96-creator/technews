import type { ReactNode } from 'react';
import { Inter, Montserrat, Space_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk' });
// Montserrat 800 CHỈ dùng cho wordmark "peek" (logo) — nội dung vẫn Inter/Grotesk.
const montserrat = Montserrat({ subsets: ['latin'], weight: '800', variable: '--font-montserrat' });

export const metadata = {
  metadataBase: new URL(SITE_URL), // gốc cho og:url / og:image tương đối
  title: 'peek — Feed tin công nghệ',
  description: 'Liếc phát biết — tin công nghệ nóng nhất, tóm tắt tiếng Việt.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${grotesk.variable} ${montserrat.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
