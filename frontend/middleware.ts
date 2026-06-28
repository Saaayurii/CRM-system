import { NextRequest, NextResponse } from 'next/server';

// Host-based routing for the chat subdomain (chat.crm.3stroy15.pro).
//
// The chat subdomain is served by THIS same Next app/container — there is no
// separate service. We just rewrite its root to the standalone chat page and
// keep everything else (the full dashboard) off the subdomain. The full app on
// the main domain is untouched.
//
// API (/api/v1) and WebSocket (/socket.io) are proxied by next.config rewrites
// and must pass through unchanged — they're excluded via the matcher below.

const CHAT_HOST_PREFIX = 'chat.';

// Paths allowed on the chat subdomain besides the chat itself: auth/portal entry
// (so login works) and the chat page route target.
function isAllowedOnChatHost(pathname: string): boolean {
  return (
    pathname.startsWith('/chatroom') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/portal/')
  );
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').split(':')[0];
  const isChatHost = host.startsWith(CHAT_HOST_PREFIX);
  const { pathname, search } = req.nextUrl;

  if (isChatHost) {
    // Unauthenticated visitor (no cross-subdomain SSO cookie) → send to login,
    // unless already on an auth/portal page.
    const hasSession = req.cookies.has('crm_at');
    if (!hasSession && !pathname.startsWith('/auth/') && !pathname.startsWith('/portal/')) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/login';
      url.search = '';
      return NextResponse.redirect(url);
    }

    // Subdomain root → render the standalone chat page (URL stays '/').
    if (pathname === '/') {
      const url = req.nextUrl.clone();
      url.pathname = '/chatroom';
      return NextResponse.rewrite(url);
    }

    // Anything outside the chat (dashboard pages don't exist here) → back to chat.
    if (!isAllowedOnChatHost(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // Main domain: the standalone chat route is subdomain-only. Send stray hits to
  // the in-dashboard chat.
  if (pathname.startsWith('/chatroom')) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard/chat';
    url.search = search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on page routes only — skip API proxy, WebSocket, Next internals, uploads
  // and any file with an extension (assets, sw.js, manifest, icons).
  matcher: ['/((?!api|_next/static|_next/image|socket.io|uploads|.*\\.).*)'],
};
