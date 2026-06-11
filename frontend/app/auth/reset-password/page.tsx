'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import RecoverySetPasswordForm, {
  RecoverableAccount,
} from '@/components/auth/RecoverySetPasswordForm';
import { useT } from '@/lib/i18n';

function ResetPasswordInner() {
  const t = useT();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [phase, setPhase] = useState<'loading' | 'form' | 'done' | 'invalid'>('loading');
  const [email, setEmail] = useState('');
  const [accounts, setAccounts] = useState<RecoverableAccount[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');

  const loadAccounts = useCallback(async () => {
    if (!token) {
      setPhase('invalid');
      return;
    }
    try {
      const { data } = await api.get('/auth/password-reset/accounts', { params: { token } });
      setEmail(data.email);
      setAccounts(data.accounts || []);
      setPhase('form');
    } catch {
      setPhase('invalid');
    }
  }, [token]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSubmit = async (userIds: number[], password: string) => {
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/password-reset/confirm', {
        token,
        userIds,
        password,
      });
      setDoneMessage(data?.message || 'Пароль обновлён.');
      setPhase('done');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось восстановить доступ. Ссылка могла устареть — запросите новую.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === 'invalid') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Ссылка недействительна
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Ссылка для восстановления недействительна или срок её действия истёк. Запросите новую.
        </p>
        <a href="/auth/forgot-password" className="btn bg-violet-500 hover:bg-violet-600 text-white w-full">
          Запросить новую ссылку
        </a>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t('Готово')}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{doneMessage}</p>
        <a href="/auth/login" className="btn bg-violet-500 hover:bg-violet-600 text-white w-full">
          Войти
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t('Новый пароль')}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
        Восстановление для <strong className="text-gray-800 dark:text-gray-200">{email}</strong>.
        {accounts.length > 1 ? ' Отметьте аккаунты, для которых нужно сбросить пароль.' : ''}
      </p>

      <RecoverySetPasswordForm
        accounts={accounts}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
      />

      <div className="mt-6 text-center">
        <a href="/auth/login" className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400">
          ← Вернуться ко входу
        </a>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-48">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
