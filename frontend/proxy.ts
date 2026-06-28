import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Публичные разделы — доступны без сессии (cookie `crm-session`).
// /landing и /portal обязаны открываться неавторизованным пользователям.
const publicPaths = ['/auth', '/landing', '/portal', '/privacy', '/health', '/maintenance'];

// Поддомен чата (chat.crm.3stroy15.pro) обслуживается этим же приложением:
// его корень переписывается на самостоятельную страницу чата, всё остальное
// (дашборд) на поддомен не пускается. Авторизация на поддомене проверяется по
// сквозной cookie `crm_at` (см. lib/ssoCookie.ts) — `crm-session` host-only и на
// поддомен не попадает.
const CHAT_HOST_PREFIX = 'chat.';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal paths and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const host = (request.headers.get('host') || '').split(':')[0];
  const isChatHost = host.startsWith(CHAT_HOST_PREFIX);

  if (isChatHost) {
    const isAuthPath = pathname.startsWith('/auth/') || pathname.startsWith('/portal/');

    // Нет сквозной сессии и это не страница входа → на форму входа.
    if (!request.cookies.has('crm_at') && !isAuthPath) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Корень поддомена → самостоятельная страница чата (URL остаётся «/»).
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/chatroom';
      return NextResponse.rewrite(url);
    }

    // Всё, что вне чата (страниц дашборда тут нет) → обратно в чат.
    if (!pathname.startsWith('/chatroom') && !isAuthPath) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  }

  // Основной домен: самостоятельный маршрут чата только для поддомена —
  // случайные заходы уводим во встроенный чат дашборда.
  if (pathname.startsWith('/chatroom')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/chat';
    return NextResponse.redirect(url);
  }

  // Корень сам решает, куда вести (клиентский редирект на /landing или /dashboard).
  const isPublic = pathname === '/' || publicPaths.some((p) => pathname.startsWith(p));
  const session = request.cookies.get('crm-session');

  if (!isPublic && !session) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
