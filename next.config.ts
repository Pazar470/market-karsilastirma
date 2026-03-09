import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn2.a101.com.tr',
      },
      {
        protocol: 'https',
        hostname: 'cdnd-tr.oyoy.net',
      },
      {
        protocol: 'https',
        hostname: 'images.csfour.com',
      },
      {
        protocol: 'https',
        hostname: 'reimg-carrefour.mncdn.com',
      },
      {
        protocol: 'https',
        hostname: 'images.migrosone.com',
      },
    ],
  },
};

export default nextConfig;
