'use client';

import { useAuthStore } from '@/stores/authStore';

/**
 * Возвращает true, если текущий пользователь — клиент портала (roleId = 15).
 * Используется в компонентах для скрытия кнопок Create/Edit/Delete и иной
 * write-функциональности (фактический запрет — на api-gateway).
 */
export function useIsClient(): boolean {
  return useAuthStore((s) => s.user?.roleId === 15);
}
