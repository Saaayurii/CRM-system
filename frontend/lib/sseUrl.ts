/** Build a full SSE URL using the same API base as Axios.
 * Токен больше не передаётся в URL — EventSource создаётся с
 * `{ withCredentials: true }`, и браузер прикладывает httpOnly-cookie сам
 * (аудит: JWT в URL попадал в логи/Referer). */
export function sseUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  return `${base}${path}`;
}
