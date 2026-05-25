'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { AxiosError } from 'axios';

export default function PortalLoginPage() {
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl p-8 border border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Клиентский портал
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Войдите по логину, который выдал ваш менеджер
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Логин
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 pr-10 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
              >
                {showPassword ? 'Скрыть' : 'Показать'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-4 py-2.5 text-white font-medium transition"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400 text-center">
          Получили ссылку от менеджера? Откройте её — войдёте автоматически.
        </p>
      </div>
    </div>
  );
}
