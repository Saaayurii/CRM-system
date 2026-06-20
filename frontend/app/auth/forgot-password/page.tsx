'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);
    try {
      await api.post('/auth/password-reset/request', { email });
      setEmailSent(true);
    } catch {
      setEmailError('Не удалось отправить запрос. Попробуйте ещё раз.');
    } finally {
      setEmailLoading(false);
    }
  };

  const spinner = (
    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        Восстановление доступа
      </h1>

      {emailSent ? (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Если аккаунт с адресом{' '}
            <strong className="text-gray-800 dark:text-gray-200">{email}</strong> существует, мы
            отправили на него письмо со ссылкой для восстановления. Проверьте входящие и папку
            «Спам».
          </p>
          <a href="/auth/login" className="btn bg-violet-500 hover:bg-violet-600 text-white w-full">
            Вернуться ко входу
          </a>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Укажите email вашего аккаунта — мы отправим ссылку для сброса пароля.
          </p>
          {emailError && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-3 text-sm text-red-600 dark:text-red-400">
              {emailError}
            </div>
          )}
          <form onSubmit={submitEmail}>
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
                autoFocus
              />
            </div>
            <div className="mt-6">
              <button type="submit" className="btn bg-violet-500 hover:bg-violet-600 text-white w-full" disabled={emailLoading}>
                {emailLoading ? spinner : 'Отправить ссылку'}
              </button>
            </div>
          </form>
        </>
      )}

      <div className="mt-6 text-center">
        <a href="/auth/login" className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400">
          ← Вернуться ко входу
        </a>
      </div>
    </div>
  );
}
