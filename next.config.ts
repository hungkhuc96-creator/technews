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
        source: '/:path*',
        has: [{ type: 'host', value: 'technews-rho-three.vercel.app' }],
        destination: 'https://peek.vn/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
