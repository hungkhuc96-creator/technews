import type { ReactNode } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk' });

export const metadata = {
  metadataBase: new URL(SITE_URL), // gốc cho og:url / og:image tương đối
  title: 'nóng — Feed tin công nghệ',
  description: 'Tổng hợp tin công nghệ nóng nhất, tóm tắt tiếng Việt.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${grotesk.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
