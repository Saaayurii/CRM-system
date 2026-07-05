// Дедупликация запроса /system-settings.
// Аудит: при каждой полной загрузке дашборда этот эндпоинт дёргают сразу три
// всегда-смонтированных потребителя (themeStore, MaintenanceGuard,
// MaintenanceIndicator) — три одинаковых запроса подряд. Здесь они схлопываются
// в один: параллельные и близкие по времени вызовы делят один промис.
// TTL короткий (5с), чтобы 30-секундные опросы maintenance по-прежнему видели
// свежие данные — кешируется только «всплеск» на монтировании.
import api from '@/lib/api';

type SettingsBody = { settings?: Record<string, unknown>; [k: string]: unknown };

let cached: { at: number; promise: Promise<SettingsBody> } | null = null;
const TTL_MS = 5000;

export function getSystemSettings(): Promise<SettingsBody> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.promise;

  const promise = api
    .get<SettingsBody>('/system-settings')
    .then((res) => res.data)
    .catch((err) => {
      // Не кешируем ошибку — следующий вызов попробует заново.
      if (cached?.promise === promise) cached = null;
      throw err;
    });

  cached = { at: now, promise };
  return promise;
}

/** Сбросить кеш (например, после PUT /system-settings), чтобы данные обновились. */
export function invalidateSystemSettings(): void {
  cached = null;
}
