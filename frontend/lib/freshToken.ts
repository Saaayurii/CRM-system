// Гарантирует свежую сессию для транспортов, которые нельзя обновить через
// axios-интерсептор 401 (EventSource/SSE, socket.io). Токен теперь в httpOnly-
// cookie и недоступен JS, поэтому вместо чтения самого токена смотрим читаемый
// хинт `crm_at_exp` (срок жизни access-токена, ставится gateway) и при близком
// истечении проактивно дёргаем refresh — gateway обновит cookie.
import { performRefresh } from '@/lib/api';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Срок жизни access-токена (epoch сек) из читаемой cookie-подсказки. */
function accessTokenExp(): number | null {
  const raw = readCookie('crm_at_exp');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Общий in-flight, чтобы параллельные вызывающие не плодили запросы обновления.
let refreshPromise: Promise<boolean> | null = null;

/**
 * Гарантирует, что access-cookie проживёт ещё как минимум `minTtlSeconds`.
 * Если срок близко (или хинта нет) — обновляет сессию. Возвращает true, если
 * сессия валидна/обновлена, false — если обновить не удалось (нужен логин).
 */
export async function ensureFreshSession(minTtlSeconds = 120): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const exp = accessTokenExp();
  if (exp && exp * 1000 - Date.now() > minTtlSeconds * 1000) {
    return true; // ещё валиден достаточно долго
  }

  if (!refreshPromise) {
    refreshPromise = performRefresh()
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}
