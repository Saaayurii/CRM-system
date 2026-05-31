import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Публичные разделы — доступны без сессии (cookie `crm-session`).
// ВАЖНО: лендинг и клиентский портал должны открываться неавторизованным.
const PUBLIC_PREFIXES = [
  '/auth',       // вход/регистрация сотрудников + 2FA
  '/landing',    // маркетинговый лендинг
  '/portal',     // клиентский портал: /portal/login, /portal/magic
  '/privacy',    // политика конфиденциальности
  '/health',     // health-check
  '/maintenance',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Пропускаем внутренние пути и статику.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/uploads/') ||
    pathname.startsWith('/socket.io') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Корень сам решает, куда вести (клиентский редирект на /landing или /dashboard).
  const isPublic =
    pathname === '/' || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  const hasSession = Boolean(request.cookies.get('crm-session'));

  if (!isPublic && !hasSession) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
