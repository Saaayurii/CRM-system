'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { AxiosError } from 'axios';
import { useT } from '@/lib/i18n';

export default function PortalLoginPage() {
  const t = useT();
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/portal/login', { login, password });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      if (data.sessionId) localStorage.setItem('sessionId', String(data.sessionId));
      document.cookie = `crm-session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      window.location.href = '/dashboard';
    } catch (err) {
      const status = err instanceof AxiosError ? err.response?.status : undefined;
      if (status === 401) setError('Неверный логин или пароль');
      else setError('Не удалось войти. Попробуйте позже.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white dark:bg-gray-950 p-4">
      {/* Brand glow background — как на лендинге */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(124,107,196,0.14),transparent)]" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/landing" className="mb-6 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon-brand.png"
            alt="3.15"
            className="w-10 h-10 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-gray-700"
          />
          <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">
            3.15 <span className="text-violet-500">CRM</span>
          </span>
        </Link>

        <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-2xl shadow-gray-900/10 dark:shadow-black/40 p-8 border border-gray-200 dark:border-gray-800">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200/60 dark:ring-violet-500/20">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
            </svg>
            Клиентский портал
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Вход для заказчика
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Войдите по логину, который выдал ваш менеджер, чтобы следить за статусом объекта.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Логин
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                autoComplete="username"
                placeholder={t('Ваш логин')}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 pr-16 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700"
                >
                  {showPassword ? 'Скрыть' : 'Показать'}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-60 px-4 py-3 text-white font-semibold shadow-lg shadow-violet-500/30 transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Вход…
                </>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 text-center">
            Получили ссылку от менеджера? Откройте её — войдёте автоматически.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <Link href="/landing" className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">
            ← На главную
          </Link>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <Link href="/auth/login" className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">
            Вход для сотрудников
          </Link>
        </div>
      </div>
    </div>
  );
}
