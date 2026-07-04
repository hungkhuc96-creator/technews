import type { NextConfig } from 'next';

// Chuyển hướng vĩnh viễn (308) mọi tên miền phụ về domain chính peek.vn —
// tránh Google coi www / link vercel.app cũ là trang trùng lặp.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.peek.vn' }],
        destination: 'https://peek.vn/:path*',
        permanent: true,
      },
      {
        // MIỄN TRỪ /api/: cron-job.org đang gọi /api/cron qua link vercel.app cũ
        // để kích nạp báo mỗi 15' — redirect cả /api từng làm pipeline ĐỨNG 4,7h
        // (pinger gặp 308 là bỏ cuộc, không follow).
        source: '/:path((?!api/).*)',
        has: [{ type: 'host', value: 'technews-rho-three.vercel.app' }],
        destination: 'https://peek.vn/:path',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
