'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

type ClientType = 'individual' | 'company' | 'government';

interface InviteInfo {
  valid: boolean;
  companyName?: string;
  projectName?: string;
  note?: string;
}

function ClientInviteForm() {
  const t = useT();
  const params = useSearchParams();
  const token = params.get('ref') ?? '';

  const [check, setCheck] = useState<'idle' | 'loading' | 'ok' | 'fail'>('loading');
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [checkError, setCheckError] = useState('');

  const [clientType, setClientType] = useState<ClientType>('individual');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setCheck('fail');
      setCheckError('В ссылке нет токена приглашения.');
      return;
    }
    (async () => {
      try {
        const { data } = await api.get(`/client-invites/${token}/check`);
        setInfo(data);
        setCheck('ok');
      } catch (err: any) {
        const code = err?.response?.status;
        if (code === 410) setCheckError('Срок действия ссылки истёк или она уже использована.');
        else if (code === 404) setCheckError('Приглашение не найдено.');
        else setCheckError('Не удалось проверить приглашение.');
        setCheck('fail');
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/client-invites/${token}/accept`, {
        clientType,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        middleName: middleName || undefined,
        companyName: companyName || undefined,
        inn: inn || undefined,
        email,
        phone: phone || undefined,
        address: address || undefined,
        password,
      });

      // Auto-login via magic-token
      if (data?.accessToken) {
        try {
          const { data: tokenResp } = await api.post('/auth/portal/magic', { token: data.accessToken });
          localStorage.setItem('accessToken', tokenResp.accessToken);
          localStorage.setItem('refreshToken', tokenResp.refreshToken);
          if (tokenResp.sessionId) localStorage.setItem('sessionId', String(tokenResp.sessionId));
          document.cookie = `crm-session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          window.location.href = '/dashboard';
          return;
        } catch {
          // fallback to manual login
        }
      }
      window.location.href = '/portal/login';
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось завершить регистрацию');
    } finally {
      setSubmitting(false);
    }
  };

  if (check === 'loading') {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto" />
        <p className="text-sm text-gray-500 mt-4">{t('Проверяем приглашение...')}</p>
      </div>
    );
  }

  if (check === 'fail') {
    return (
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t('Приглашение недоступно')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{checkError}</p>
        <Link
          href="/portal/login"
          className="mt-6 inline-block px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
        >
          Войти в портал
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5">
        <div className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 mb-3">
          ✓ Приглашение действительно
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Регистрация в портале
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Компания <span className="font-semibold text-gray-700 dark:text-gray-200">{info?.companyName}</span>
          {info?.projectName ? (
            <>
              {' '}приглашает вас в проект{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">«{info.projectName}»</span>
            </>
          ) : null}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Вы регистрируетесь как:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['individual', '👤', 'Физ. лицо'],
              ['company', '🏢', 'Компания'],
              ['government', '🏛', 'Гос. орган'],
            ].map(([v, icon, label]) => (
              <button
                type="button"
                key={v}
                onClick={() => setClientType(v as ClientType)}
                className={`p-2 rounded-lg border-2 text-xs transition-all ${
                  clientType === v
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <div className="text-xl">{icon}</div>
                <div className="mt-1">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {clientType === 'individual' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Фамилия')}</label>
              <input className="form-input w-full" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Имя <span className="text-red-500">*</span>
              </label>
              <input
                required
                className="form-input w-full"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Название организации <span className="text-red-500">*</span>
              </label>
              <input
                required
                className="form-input w-full"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('ИНН')}</label>
              <input className="form-input w-full" value={inn} onChange={(e) => setInn(e.target.value)} />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="email"
            className="form-input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-[10px] text-gray-400 mt-1">{t('Будет использоваться как логин')}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Телефон')}</label>
          <input className="form-input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Пароль <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              required
              type={showPassword ? 'text' : 'password'}
              className="form-input w-full pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{t('Минимум 8 символов')}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Повторите пароль <span className="text-red-500">*</span>
          </label>
          <input
            required
            type={showPassword ? 'text' : 'password'}
            className="form-input w-full"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-medium rounded-lg"
        >
          {submitting ? 'Создаём аккаунт...' : 'Завершить регистрацию'}
        </button>

        <p className="text-center text-xs text-gray-400">
          Уже есть доступ? <Link href="/portal/login" className="text-violet-600 hover:underline">{t('Войти в портал')}</Link>
        </p>
      </form>
    </>
  );
}

export default function ClientInvitePage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="text-center py-10 text-gray-500">{t('Загрузка...')}</div>}>
      <ClientInviteForm />
    </Suspense>
  );
}
