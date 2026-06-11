'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

interface SecuritySettings {
  require_2fa: boolean;
  max_login_attempts: number;
}

const ATTEMPT_OPTIONS = [3, 5, 10];

export default function SecurityTab() {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [require2fa, setRequire2fa] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(5);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/system-settings');
      const s = (data?.settings ?? {}) as Partial<SecuritySettings>;
      setRequire2fa(Boolean(s.require_2fa));
      setMaxAttempts(Number(s.max_login_attempts) || 5);
    } catch {
      addToast('error', 'Не удалось загрузить настройки безопасности');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch: Partial<SecuritySettings>) => {
    const next = { require_2fa: require2fa, max_login_attempts: maxAttempts, ...patch };
    // optimistic
    if (patch.require_2fa !== undefined) setRequire2fa(patch.require_2fa);
    if (patch.max_login_attempts !== undefined) setMaxAttempts(patch.max_login_attempts);
    try {
      setSaving(true);
      await api.put('/system-settings', { settings: next });
      addToast('success', 'Настройки безопасности сохранены');
    } catch {
      addToast('error', 'Не удалось сохранить');
      load(); // revert to server state
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Two-factor authentication */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
              Двухфакторная аутентификация (2FA)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
              Когда включено, все сотрудники компании при входе подтверждают вход 6-значным кодом
              из приложения-аутентификатора (Google Authenticator, 1Password и др.). При первом
              входе после включения сотрудник один раз настраивает 2FA по QR-коду.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={require2fa}
            disabled={saving}
            onClick={() => save({ require_2fa: !require2fa })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              require2fa ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                require2fa ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {require2fa && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-sm text-emerald-800 dark:text-emerald-300">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            2FA включена для всей компании.
          </div>
        )}
      </div>

      {/* Brute-force protection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Защита от подбора пароля
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
          После нескольких неудачных попыток входа учётная запись временно блокируется на 15 минут.
        </p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Максимум неудачных попыток
          </label>
          <select
            value={maxAttempts}
            disabled={saving}
            onChange={(e) => save({ max_login_attempts: Number(e.target.value) })}
            className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
          >
            {ATTEMPT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} попыток
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
