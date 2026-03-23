import type { NextConfig } from 'next';

// Internal URLs: used by Next.js server-side rewrites (SSR → backend, Docker network)
// Dev default: localhost. Production Docker: set via env (api-gateway:3000, chat-service:3011)
const API_GATEWAY_INTERNAL_URL =
  process.env.API_GATEWAY_INTERNAL_URL || 'http://localhost:3000';
const CHAT_SERVICE_INTERNAL_URL =
  process.env.CHAT_SERVICE_INTERNAL_URL || 'http://localhost:3011';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Silence Turbopack warning — no webpack plugins needed
  turbopack: {},
  allowedDevOrigins: [
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.ngrok.app',
    '*.lhr.life',
    '*.trycloudflare.com',
  ],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_GATEWAY_INTERNAL_URL}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${API_GATEWAY_INTERNAL_URL}/uploads/:path*`,
      },
      {
        source: '/socket.io',
        destination: `${CHAT_SERVICE_INTERNAL_URL}/socket.io`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${CHAT_SERVICE_INTERNAL_URL}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
