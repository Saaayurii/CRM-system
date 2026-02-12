import { NextRequest } from 'next/server';

// Known super_admin roleId from seed data
const SUPER_ADMIN_ROLE_ID = 1;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.slice(7);

  // First: quick JWT decode to check roleId (no network call)
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  // Check token expiration
  const exp = payload.exp as number | undefined;
  if (exp && exp * 1000 < Date.now()) return false;

  const roleId = payload.roleId as number | null;
  if (roleId === SUPER_ADMIN_ROLE_ID) return true;

  // Fallback: call backend /auth/me for cases where roleId might differ
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return false;
    const user = await res.json();
    // Check both patterns: user.role.code or user.roleId
    return user?.role?.code === 'super_admin' || user?.roleId === SUPER_ADMIN_ROLE_ID;
  } catch {
    // If backend is down but JWT decode passed, trust the JWT
    return roleId === SUPER_ADMIN_ROLE_ID;
  }
}
