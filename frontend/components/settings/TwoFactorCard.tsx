'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface Status {
  enabled: boolean;
  required: boolean;
}

interface SetupData {
  token: string;
  otpauthUrl: string;
  qrDataUrl: string;
  secret: string;
}

export default function TwoFactorCard() {
  const addToast = useToastStore((s) => s.addToast);

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Enrollment flow
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState('');

  // Disable flow
  const [disabling, setDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Status>('/auth/2fa/status');
      setStatus(data);
    } catch {
      addToast('error', 'Не удалось загрузить статус 2FA');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<SetupData>('/auth/2fa/setup');
      setSetup(data);
      setCode('');
    } catch {
      addToast('error', 'Не удалось начать настройку 2FA');
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setup) return;
    setBusy(true);
    try {
      await api.post('/auth/2fa/confirm', { token: setup.token, code: code.trim() });
      addToast('success', 'Двухфакторная аутентификация включена');
      setSetup(null);
      setCode('');
      await loadStatus();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Неверный код подтверждения');
    } finally {
      setBusy(false);
    }
  };

  const confirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/2fa/disable', { code: disableCode.trim() });
      addToast('success', 'Двухфакторная аутентификация отключена');
      setDisabling(false);
      setDisableCode('');
      await loadStatus();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Не удалось отключить 2FA');
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 text-center tracking-[0.4em] text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent';

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
            Двухфакторная аутентификация (2FA)
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Дополнительная защита входа: код из приложения-аутентификатора (Google Authenticator, 1Password и др.)
          </p>
        </div>
        {!loading && status && (
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ${
              status.enabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {status.enabled ? 'Включена' : 'Отключена'}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Загрузка...</p>
      ) : (
        <div className="mt-5">
          {/* Enrollment QR flow */}
          {setup ? (
            <form onSubmit={confirmSetup} className="border-t border-gray-100 dark:border-gray-700 pt-5">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Отсканируйте QR-код в приложении-аутентификаторе, затем введите 6-значный код для подтверждения.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="bg-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setup.qrDataUrl} alt="QR-код для 2FA" className="w-40 h-40" />
                </div>
                <div className="flex-1 w-full">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Ключ для ручного ввода:</p>
                  <p className="font-mono text-xs text-gray-600 dark:text-gray-300 break-all mb-4 select-all">
                    {setup.secret}
                  </p>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Код подтверждения
                  </label>
                  <input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className={`${inputCls} max-w-[200px]`}
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      type="submit"
                      disabled={busy || code.length < 6}
                      className="px-5 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {busy ? 'Проверка...' : 'Включить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSetup(null); setCode(''); }}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : disabling ? (
            /* Disable confirmation flow */
            <form onSubmit={confirmDisable} className="border-t border-gray-100 dark:border-gray-700 pt-5 max-w-sm">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Для отключения введите текущий код из приложения-аутентификатора.
              </p>
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className={`${inputCls} max-w-[200px]`}
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  disabled={busy || disableCode.length < 6}
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {busy ? 'Проверка...' : 'Отключить 2FA'}
                </button>
                <button
                  type="button"
                  onClick={() => { setDisabling(false); setDisableCode(''); }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : status?.enabled ? (
            <div className="flex items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-700 pt-5">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {status.required
                  ? 'Двухфакторная аутентификация обязательна в вашей компании и не может быть отключена.'
                  : 'Защита включена. При входе потребуется код из приложения.'}
              </p>
              {!status.required && (
                <button
                  onClick={() => setDisabling(true)}
                  className="shrink-0 px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
                >
                  Отключить
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-700 pt-5">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {status?.required
                  ? 'В вашей компании 2FA обязательна — настройте её сейчас.'
                  : 'Включите 2FA, чтобы защитить аккаунт дополнительным кодом при входе.'}
              </p>
              <button
                onClick={startSetup}
                disabled={busy}
                className="shrink-0 px-5 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {busy ? 'Подождите...' : 'Включить 2FA'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
