'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

export default function PortalMagicPage() {
  const t = useT();
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Проверяем ссылку...');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('В ссылке нет токена доступа.');
      return;
    }

    (async () => {
      try {
        const { data } = await api.post('/auth/portal/magic', { token });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        if (data.sessionId) localStorage.setItem('sessionId', String(data.sessionId));
        document.cookie = `crm-session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        window.location.href = '/dashboard';
      } catch {
        setStatus('error');
        setMessage('Ссылка недействительна или истекла. Запросите у менеджера новый доступ.');
      }
    })();
  }, [params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl p-8 border border-slate-200 dark:border-slate-800 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Клиентский портал
        </h1>
        <p className={`text-sm ${status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {message}
        </p>
        {status === 'error' && (
          <a
            href="/portal/login"
            className="mt-6 inline-block rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-white text-sm font-medium"
          >
            Войти по логину и паролю
          </a>
        )}
      </div>
    </div>
  );
}
