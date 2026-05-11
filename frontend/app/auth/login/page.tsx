'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { AxiosError } from 'axios';

interface AccountChoice {
  id: number;
  name: string;
  logoUrl?: string;
}

type LoginError = { message: string; kind: 'error' | 'warning' };

function getLoginError(err: unknown): LoginError {
  const serverMsg = (err instanceof AxiosError)
    ? (err.response?.data as { message?: string })?.message
    : (err as any)?.response?.data?.message;

  const status = (err instanceof AxiosError)
    ? err.response?.status
    : (err as any)?.response?.status;

  if (!status) return { message: 'Сервер недоступен. Проверьте подключение к сети', kind: 'error' };

  if (status === 401) {
    if (serverMsg && serverMsg.includes('заявка')) {
      return { message: serverMsg, kind: 'warning' };
    }
    return { message: 'Неверный email или пароль', kind: 'error' };
  }
  if (status === 403) return { message: 'Аккаунт деактивирован', kind: 'error' };
  return { message: serverMsg || `Ошибка сервера (${status})`, kind: 'error' };
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountChoice[] | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.accounts?.length > 0) {
        setAccounts(data.accounts);
        return;
      }
      await login({ email, password });
      router.push('/dashboard');
    } catch (err) {
      setLoginError(getLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = async (accountId: number) => {
    setLoginError(null);
    setLoading(true);
    try {
      await login({ email, password, accountId });
      router.push('/dashboard');
    } catch (err) {
      setAccounts(null);
      setLoginError(getLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Company selection screen ──
  if (accounts) {
    return (
      <div className="w-full max-w-sm">
        <button
          onClick={() => setAccounts(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Назад
        </button>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Выберите компанию</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Email <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span> зарегистрирован в нескольких организациях
        </p>

        <div className="space-y-2">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => handleSelectAccount(acc.id)}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-sm transition-all text-left disabled:opacity-50 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                {acc.logoUrl ? (
                  <img src={acc.logoUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-300">
                    {acc.name[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {acc.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">ID: {acc.id}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Login form ──
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-6">Вход в систему</h1>

      {loginError && loginError.kind === 'warning' && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-lg mb-4 text-sm flex items-start gap-2">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>{loginError.message}</span>
        </div>
      )}
      {loginError && loginError.kind === 'error' && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm flex items-start gap-2">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>{loginError.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="form-input w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="password">
              Пароль
            </label>
            <div className="relative">
              <input
                id="password"
                className="form-input w-full pr-10"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button
            type="submit"
            className="btn bg-violet-500 hover:bg-violet-600 text-white w-full"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Войти'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <span className="text-sm text-gray-500 dark:text-gray-400">Нет аккаунта? </span>
        <a href="/auth/register" className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400">
          Зарегистрироваться
        </a>
      </div>
      <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
        <a href="/privacy" className="underline hover:text-violet-500 transition-colors">
          Политика конфиденциальности
        </a>
      </p>
    </div>
  );
}
