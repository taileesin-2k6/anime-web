import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    '*.trycloudflare.com',
    'localhost:3000',
    '127.0.0.1:3000',
    '192.168.1.25:3000',
  ],
  async headers() {
    return [
      {
        source: '/watch/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=31536000, s-maxage=31536000' },
          { key: 'Cloudflare-CDN-Cache-Control', value: 'public, max-age=31536000, s-maxage=31536000' },
        ],
      },
      {
        source: '/api/stream',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Range, Accept, Content-Type' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=31536000, s-maxage=31536000' },
          { key: 'Cloudflare-CDN-Cache-Control', value: 'public, max-age=31536000, s-maxage=31536000' },
        ],
      },
    ];
  },
};

export default nextConfig;
