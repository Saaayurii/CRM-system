/** Build a full SSE URL using the same API base as Axios */
export function sseUrl(path: string, token: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
