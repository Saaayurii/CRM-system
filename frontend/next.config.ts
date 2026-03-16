import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Allow ngrok and any external tunnel domains
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io', '*.ngrok.app', '*.lhr.life', '*.trycloudflare.com'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3000/api/v1/:path*',
      },
      {
        source: '/socket.io',
        destination: 'http://localhost:3011/socket.io',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3011/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
