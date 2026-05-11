'use client';

import { useState, useRef, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

function RegisterCompanyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);

  const inviteToken = searchParams.get('invite') ?? '';

  const [tokenState, setTokenState] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [tokenError, setTokenError] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirm, setAdminConfirm] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inviteToken) {
      setTokenState('invalid');
      setTokenError('Регистрация доступна только по инвайт-ссылке. Обратитесь к администратору.');
      return;
    }
    api.get(`/auth/invites/${inviteToken}/check`)
      .then(({ data }) => {
        if (data.valid) {
          setTokenState('valid');
        } else {
          setTokenState('invalid');
          const msg: Record<string, string> = {
            used: 'Эта инвайт-ссылка уже была использована.',
            expired: 'Срок действия инвайт-ссылки истёк.',
            not_found: 'Инвайт-ссылка недействительна.',
          };
          setTokenError(msg[data.reason] ?? 'Инвайт-ссылка недействительна.');
        }
      })
      .catch(() => {
        setTokenState('invalid');
        setTokenError('Не удалось проверить инвайт-ссылку.');
      });
  }, [inviteToken]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (adminPassword !== adminConfirm) { setError('Пароли не совпадают'); return; }
    if (adminPassword.length < 8) { setError('Пароль должен быть не менее 8 символов'); return; }

    setLoading(true);
    try {
      let logoUrl: string | undefined;

      if (logoFile) {
        const fd = new FormData();
        fd.append('file', logoFile);
        try {
          const { data } = await api.post('/auth/upload-logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          logoUrl = data?.url || data?.fileUrl;
        } catch { /* logo upload is optional */ }
      }

      const { data: regData } = await api.post('/auth/register-company', {
        companyName,
        logoUrl,
        adminName,
        adminEmail,
        adminPassword,
        adminPhone: adminPhone || undefined,
        inviteToken,
      });

      // Use tokens returned directly from registration — avoids multi-account selector
      if (regData.accessToken) {
        localStorage.setItem('accessToken', regData.accessToken);
        localStorage.setItem('refreshToken', regData.refreshToken);
        if (regData.sessionId) localStorage.setItem('sessionId', String(regData.sessionId));
        document.cookie = `crm-session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      } else {
        await login({ email: adminEmail, password: adminPassword, accountId: regData.user?.accountId });
      }
      router.replace('/dashboard');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as any).response?.data?.message || 'Ошибка регистрации')
          : 'Ошибка подключения к серверу';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (tokenState === 'checking') {
    return (
      <div className="w-full max-w-sm text-center py-12">
        <svg className="animate-spin h-8 w-8 text-violet-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-gray-500">Проверка инвайт-ссылки...</p>
      </div>
    );
  }

  if (tokenState === 'invalid') {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-red-500/10 border border-red-200 dark:border-red-800/50 rounded-xl p-6 text-center">
          <svg className="w-10 h-10 text-red-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Недействительная ссылка</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tokenError}</p>
          <a href="/auth/login" className="mt-4 inline-block text-sm text-violet-500 hover:text-violet-600">
            Войти в существующий аккаунт
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-1">Регистрация компании</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Создайте аккаунт для вашей организации</p>

      {error && (
        <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Данные компании</p>
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden hover:border-violet-400 transition-colors shrink-0"
            >
              {logoPreview
                ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                : (
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M7.5 8.25h.008v.008H7.5V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                )}
            </button>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-violet-500 hover:text-violet-600 font-medium">
                {logoPreview ? 'Изменить логотип' : 'Загрузить логотип'}
              </button>
              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG до 2 МБ</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Название компании <span className="text-red-500">*</span>
            </label>
            <input
              className="form-input w-full"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="ООО Строй Групп"
              required
            />
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Данные администратора</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              ФИО <span className="text-red-500">*</span>
            </label>
            <input
              className="form-input w-full"
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              className="form-input w-full"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@company.ru"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Телефон</label>
            <input
              className="form-input w-full"
              type="tel"
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              placeholder="+7 999 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Пароль <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                className="form-input w-full pr-10"
                type={showPass ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                required
                minLength={8}
              />
              <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                {showPass
                  ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Подтверждение пароля <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                className="form-input w-full pr-10"
                type={showConfirm ? 'text' : 'password'}
                value={adminConfirm}
                onChange={(e) => setAdminConfirm(e.target.value)}
                placeholder="Повторите пароль"
                required
                minLength={8}
              />
              <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                {showConfirm
                  ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
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
            {loading
              ? <svg className="animate-spin h-5 w-5 text-white mx-auto" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              : 'Создать компанию'}
          </button>
        </div>
      </form>

      <div className="mt-4 text-center">
        <span className="text-sm text-gray-500 dark:text-gray-400">Уже есть аккаунт? </span>
        <a href="/auth/login" className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400">Войти</a>
      </div>
      <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
        Регистрируясь, вы соглашаетесь с{' '}
        <a href="/privacy" className="underline hover:text-violet-500 transition-colors">
          политикой конфиденциальности
        </a>
      </p>
    </div>
  );
}

export default function RegisterCompanyPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm text-center py-12 text-sm text-gray-400">Загрузка...</div>}>
      <RegisterCompanyForm />
    </Suspense>
  );
}
