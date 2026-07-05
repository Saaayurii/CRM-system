import type { NextConfig } from 'next';

// Internal URLs: used by Next.js server-side rewrites (SSR → backend, Docker network)
// Dev default: localhost. Production Docker: set via env (api-gateway:3000, chat-service:3011)
const API_GATEWAY_INTERNAL_URL =
  process.env.API_GATEWAY_INTERNAL_URL || process.env.API_GATEWAY_URL || 'http://localhost:3000';
const CHAT_SERVICE_INTERNAL_URL =
  process.env.CHAT_SERVICE_INTERNAL_URL || 'http://localhost:3011';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Не раскрываем стек фронта: убираем `X-Powered-By: Next.js` (аудит #7).
  poweredByHeader: false,
  // React Compiler (stable в Next 16, требует babel-plugin-react-compiler).
  // Автоматически мемоизирует компоненты — снимает нужду в ручных
  // useMemo/useCallback/memo. Не включён по умолчанию, включаем осознанно.
  reactCompiler: true,
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

  // Заголовки безопасности (аудит: отсутствовали CSP/HSTS/X-Frame-Options и т.д.).
  // Применяются ко всем маршрутам. CSP намеренно оставляет script/style
  // 'unsafe-inline' — Next.js инжектит инлайн-бутстрап и стили без nonce;
  // ужесточить до nonce можно отдельным шагом. Остальные директивы уже реально
  // защищают (clickjacking, MIME-sniffing, base-uri, object-src, connect-src).
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      // Next.js/React инлайн-скрипты; 'unsafe-eval' нужен части рантайма в dev.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // Аватары/логотипы/вложения из S3 (s3.regru.cloud) + data/blob для превью.
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      // API/SSE идут через тот же origin (rewrites), плюс WebSocket чата.
      "connect-src 'self' https: wss: ws:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self), payment=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
