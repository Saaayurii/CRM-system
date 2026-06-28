// Cross-subdomain SSO for the chat subdomain.
//
// Auth tokens normally live in localStorage, which is per-origin and is NOT
// shared between `crm.3stroy15.pro` and `chat.crm.3stroy15.pro`. To make a
// single login carry over to the chat subdomain we mirror the tokens into
// cookies scoped to the shared parent domain. On first visit to a sibling
// subdomain `hydrateTokensFromCookie()` copies them back into localStorage so
// all existing token plumbing (api.ts, socket.ts, authStore) keeps working
// unchanged.
//
// Security note: these cookies are JS-readable, the same exposure as the
// existing localStorage tokens — no regression versus the current model.

const ACCESS_COOKIE = 'crm_at';
const REFRESH_COOKIE = 'crm_rt';
const MAX_AGE = 60 * 60 * 24 * 7; // 7d — matches the crm-session cookie lifetime

// Parent domain shared by the main app and the chat subdomain. Derived from the
// current host by dropping a leading `chat.` label. On localhost/IP we return
// null — browsers reject domain-scoped cookies there, so the cookie stays
// host-only (dev still works, just without cross-subdomain sharing).
function rootDomain(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (host === 'localhost' || /^[0-9.]+$/.test(host)) return null;
  return host.startsWith('chat.') ? host.slice('chat.'.length) : host;
}

function cookieSuffix(): string {
  const domain = rootDomain();
  const domainAttr = domain ? `; domain=${domain}` : '';
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  return `; path=/${domainAttr}; SameSite=Lax${secure}`;
}

export function writeSsoTokens(accessToken: string, refreshToken: string): void {
  if (typeof document === 'undefined') return;
  const suffix = cookieSuffix();
  document.cookie = `${ACCESS_COOKIE}=${accessToken}; max-age=${MAX_AGE}${suffix}`;
  document.cookie = `${REFRESH_COOKIE}=${refreshToken}; max-age=${MAX_AGE}${suffix}`;
}

export function clearSsoTokens(): void {
  if (typeof document === 'undefined') return;
  const suffix = cookieSuffix();
  document.cookie = `${ACCESS_COOKIE}=; max-age=0${suffix}`;
  document.cookie = `${REFRESH_COOKIE}=; max-age=0${suffix}`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

// First visit to a sibling subdomain: localStorage is empty but the shared
// cookie carries the session. Copy it back so the rest of the app sees a
// logged-in user. No-op if a session already exists locally.
export function hydrateTokensFromCookie(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('accessToken')) return;
  const at = readCookie(ACCESS_COOKIE);
  const rt = readCookie(REFRESH_COOKIE);
  if (at && rt) {
    localStorage.setItem('accessToken', at);
    localStorage.setItem('refreshToken', rt);
  }
}
