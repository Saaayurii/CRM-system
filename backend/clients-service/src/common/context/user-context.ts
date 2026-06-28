import { AsyncLocalStorage } from 'node:async_hooks';

/** Per-request store: кто инициировал запрос (для атрибуции DB-аудита). */
export interface UserContextStore {
  userId?: number;
}

export const userContext = new AsyncLocalStorage<UserContextStore>();

/** Текущий пользователь запроса (или undefined вне HTTP-контекста: boot, джобы). */
export function getCurrentUserId(): number | undefined {
  return userContext.getStore()?.userId;
}
