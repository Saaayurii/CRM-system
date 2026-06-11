'use client';

import { useState } from 'react';
import api from '@/lib/api';
import RecoverySetPasswordForm, {
  RecoverableAccount,
} from '@/components/auth/RecoverySetPasswordForm';
import { useT } from '@/lib/i18n';

type Mode = 'email' | 'phone';
type PhoneStep = 'phone' | 'code' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const t = useT();
  const [mode, setMode] = useState<Mode>('email');

  // ── Email flow ──
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  // ── Phone flow ──
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneToken, setPhoneToken] = useState('');
  const [accounts, setAccounts] = useState<RecoverableAccount[]>([]);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [doneMessage, setDoneMessage] = useState('');

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

  const submitPhoneRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneLoading(true);
    try {
      await api.post('/auth/phone-reset/request', { phone });
      setPhoneStep('code');
    } catch {
      setPhoneError('Не удалось отправить код. Попробуйте ещё раз.');
    } finally {
      setPhoneLoading(false);
    }
  };

  const submitPhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneLoading(true);
    try {
      const { data } = await api.post('/auth/phone-reset/verify', { phone, code });
      setPhoneToken(data.token);
      setAccounts(data.accounts || []);
      setPhoneStep('reset');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Неверный код или срок его действия истёк.';
      setPhoneError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setPhoneLoading(false);
    }
  };

  const submitPhoneConfirm = async (userIds: number[], password: string) => {
    setPhoneError('');
    setPhoneLoading(true);
    try {
      const { data } = await api.post('/auth/phone-reset/confirm', {
        token: phoneToken,
        userIds,
        password,
      });
      setDoneMessage(data?.message || 'Пароль обновлён.');
      setPhoneStep('done');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось восстановить доступ. Запросите код заново.';
      setPhoneError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setPhoneLoading(false);
    }
  };

  const spinner = (
    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  const switchMode = (m: Mode) => {
    setMode(m);
    setEmailError('');
    setPhoneError('');
  };

  // Phone flow final/intermediate screens render without the mode switcher.
  if (mode === 'phone' && phoneStep === 'done') {
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

  if (mode === 'phone' && phoneStep === 'reset') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t('Новый пароль')}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Код подтверждён.
          {accounts.length > 1 ? ' Отметьте аккаунты, для которых нужно сбросить пароль.' : ''}
        </p>
        <RecoverySetPasswordForm
          accounts={accounts}
          submitting={phoneLoading}
          error={phoneError}
          onSubmit={submitPhoneConfirm}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        Восстановление доступа
      </h1>

      {/* Mode switcher */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
        {([
          { key: 'email' as Mode, label: 'По email' },
          { key: 'phone' as Mode, label: 'По телефону' },
        ]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchMode(t.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === t.key
                ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'email' &&
        (emailSent ? (
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
        ))}

      {mode === 'phone' && (
        <>
          {phoneError && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-3 text-sm text-red-600 dark:text-red-400">
              {phoneError}
            </div>
          )}

          {phoneStep === 'phone' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Укажите номер телефона аккаунта — мы отправим код в SMS.
              </p>
              <form onSubmit={submitPhoneRequest}>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="phone">
                    Телефон
                  </label>
                  <input
                    id="phone"
                    className="form-input w-full"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 999 123-45-67"
                    required
                    autoFocus
                  />
                </div>
                <div className="mt-6">
                  <button type="submit" className="btn bg-violet-500 hover:bg-violet-600 text-white w-full" disabled={phoneLoading}>
                    {phoneLoading ? spinner : 'Отправить код'}
                  </button>
                </div>
              </form>
            </>
          )}

          {phoneStep === 'code' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Если аккаунт с номером{' '}
                <strong className="text-gray-800 dark:text-gray-200">{phone}</strong> существует, мы
                отправили на него код. Введите его ниже.
              </p>
              <form onSubmit={submitPhoneVerify}>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="code">
                    Код из SMS
                  </label>
                  <input
                    id="code"
                    className="form-input w-full tracking-[0.5em] text-center text-lg"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    required
                    autoFocus
                  />
                </div>
                <div className="mt-6">
                  <button type="submit" className="btn bg-violet-500 hover:bg-violet-600 text-white w-full" disabled={phoneLoading}>
                    {phoneLoading ? spinner : 'Подтвердить код'}
                  </button>
                </div>
              </form>
              <button
                type="button"
                onClick={() => {
                  setCode('');
                  setPhoneError('');
                  setPhoneStep('phone');
                }}
                className="mt-4 text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 w-full text-center"
              >
                Изменить номер
              </button>
            </>
          )}
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
