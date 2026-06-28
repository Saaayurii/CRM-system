// Returns a guaranteed-valid access token for transports that bake the token
// into a URL (EventSource/SSE), where the Axios 401-refresh interceptor can't
// help. Refreshes proactively when the current token is close to expiry.
import axios from 'axios';
import { writeSsoTokens } from '@/lib/ssoCookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Shared in-flight refresh so concurrent callers don't fire multiple requests
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    writeSsoTokens(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

/**
 * Returns a valid access token, refreshing it first if it is missing or
 * expires within `minTtlSeconds`. Returns null if no valid token can be
 * obtained (e.g. refresh token is also gone).
 */
export async function getFreshAccessToken(
  minTtlSeconds = 120,
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('accessToken');
  if (token) {
    const exp = decodeJwt(token)?.exp;
    if (exp && exp * 1000 - Date.now() > minTtlSeconds * 1000) {
      return token; // still valid long enough
    }
  }

  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
