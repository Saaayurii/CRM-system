'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

interface SystemSettings {
  logoUrl?: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  theme: 'light' | 'dark' | 'system';
  maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_end_time: string;
  maintenance_title: string;
  maintenance_contact_email: string;
  maintenance_allowed_roles: string[];
  allow_registration: boolean;
  require_invite: boolean;
  auto_approve_users: boolean;
  session_timeout_minutes: number;
  max_login_attempts: number;
  password_min_length: number;
  require_2fa: boolean;
  language: 'ru' | 'en';
  date_format: 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  time_format: '24h' | '12h';
  timezone: string;
  currency: 'RUB' | 'USD' | 'EUR' | 'KZT' | 'UZS' | 'BYN' | 'UAH';
  max_file_size_mb: number;
}

interface AccountData {
  id: number;
  name: string;
  subdomain: string;
  settings: Partial<SystemSettings> | null;
  status: string;
}

const defaults: SystemSettings = {
  logoUrl: '',
  notifications_enabled: true,
  email_notifications: true,
  sms_notifications: false,
  push_notifications: true,
  theme: 'system',
  maintenance_mode: false,
  maintenance_message: '',
  maintenance_end_time: '',
  maintenance_title: '',
  maintenance_contact_email: '',
  maintenance_allowed_roles: [],
  allow_registration: true,
  require_invite: false,
  auto_approve_users: false,
  session_timeout_minutes: 60,
  max_login_attempts: 5,
  password_min_length: 8,
  require_2fa: false,
  language: 'ru',
  date_format: 'DD.MM.YYYY',
  time_format: '24h',
  timezone: 'Europe/Moscow',
  currency: 'RUB',
  max_file_size_mb: 10,
};

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
        enabled ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="text-violet-500">{icon}</span>
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700/60 first:border-t-0">
      <div className="pr-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Sel<T extends string | number>({ value, options, onChange }: { value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        onChange((typeof value === 'number' ? Number(raw) : raw) as T);
      }}
      className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
    >
      {options.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function CompanyPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const addToast = useToastStore((st) => st.addToast);

  const [account, setAccount] = useState<AccountData | null>(null);
  const [s, setS] = useState<SystemSettings>(defaults);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const code = user?.role?.code;
    if (user && code !== 'admin' && code !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/system-settings');
      const data: AccountData = res.data;
      setAccount(data);
      setCompanyName(data.name || '');
      const loaded = data.settings || {};
      setS({ ...defaults, ...loaded });
    } catch {
      addToast('error', 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const upd = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingLogo(true);
      const { data } = await api.post('/users/avatar/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string = data.fileUrl || data.url || '';
      upd('logoUrl', url);
      addToast('success', 'Логотип загружен');
    } catch {
      addToast('error', 'Ошибка загрузки логотипа');
    } finally {
      setUploadingLogo(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const cleanSettings = Object.fromEntries(
        Object.entries(s).filter(([, v]) => v !== null && v !== undefined)
      );
      await api.put('/system-settings', { name: companyName, settings: cleanSettings });
      addToast('success', 'Настройки компании сохранены');
    } catch {
      addToast('error', 'Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">Компания</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Настройки вашей организации</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* ── Профиль компании ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 xl:col-span-2">
          <SectionHeader
            title="Профиль компании"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            }
          />
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Logo */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                {s.logoUrl ? (
                  <img src={s.logoUrl} alt="Логотип" className="w-full h-full object-contain" />
                ) : (
                  <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                  </svg>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files)} />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {uploadingLogo ? (
                  <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                )}
                {uploadingLogo ? 'Загрузка...' : 'Загрузить логотип'}
              </button>
              {s.logoUrl && (
                <button onClick={() => upd('logoUrl', '')} className="text-xs text-red-500 hover:text-red-600 transition-colors">
                  Удалить
                </button>
              )}
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название компании</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              {account && (
                <div className="grid grid-cols-3 gap-3 text-xs pt-2">
                  <div>
                    <p className="text-gray-400 dark:text-gray-500">ID аккаунта</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{account.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500">Поддомен</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{account.subdomain || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500">Статус</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{account.status}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Уведомления ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
          <SectionHeader
            title="Уведомления"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            }
          />
          <Row label="Все уведомления" description="Глобальное отключение всех уведомлений">
            <Toggle enabled={s.notifications_enabled} onChange={(v) => upd('notifications_enabled', v)} />
          </Row>
          <Row label="Email-уведомления">
            <Toggle enabled={s.email_notifications} onChange={(v) => upd('email_notifications', v)} />
          </Row>
          <Row label="SMS-уведомления">
            <Toggle enabled={s.sms_notifications} onChange={(v) => upd('sms_notifications', v)} />
          </Row>
          <Row label="Push-уведомления">
            <Toggle enabled={s.push_notifications} onChange={(v) => upd('push_notifications', v)} />
          </Row>
        </div>

        {/* ── Оформление ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
          <SectionHeader
            title="Оформление"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
              </svg>
            }
          />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Принудительная тема для всех</p>
          <div className="flex gap-2 flex-wrap">
            {([
              { value: 'system' as const, label: 'Системная' },
              { value: 'light' as const, label: 'Светлая' },
              { value: 'dark' as const, label: 'Тёмная' },
            ]).map((t) => (
              <button
                key={t.value}
                onClick={() => upd('theme', t.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  s.theme === t.value
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">«Системная» — каждый пользователь выбирает тему сам</p>
        </div>

        {/* ── Доступ и регистрация ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
          <SectionHeader
            title="Доступ и регистрация"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0Zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0Zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0Z" />
              </svg>
            }
          />
          <Row label="Самостоятельная регистрация" description="Новые пользователи могут регистрироваться без приглашения">
            <Toggle enabled={s.allow_registration} onChange={(v) => upd('allow_registration', v)} />
          </Row>
          <Row label="Только по приглашению" description="Вход возможен только для приглашённых пользователей">
            <Toggle enabled={s.require_invite} onChange={(v) => upd('require_invite', v)} />
          </Row>
          <Row label="Автоподтверждение новых пользователей">
            <Toggle enabled={s.auto_approve_users} onChange={(v) => upd('auto_approve_users', v)} />
          </Row>
        </div>

        {/* ── Безопасность ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
          <SectionHeader
            title="Безопасность"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            }
          />
          <Row label="Таймаут сессии">
            <Sel value={s.session_timeout_minutes} onChange={(v) => upd('session_timeout_minutes', v)}
              options={[{ label: '15 минут', value: 15 }, { label: '30 минут', value: 30 }, { label: '1 час', value: 60 }, { label: '2 часа', value: 120 }, { label: '8 часов', value: 480 }]}
            />
          </Row>
          <Row label="Макс. попыток входа">
            <Sel value={s.max_login_attempts} onChange={(v) => upd('max_login_attempts', v)}
              options={[{ label: '3 попытки', value: 3 }, { label: '5 попыток', value: 5 }, { label: '10 попыток', value: 10 }]}
            />
          </Row>
          <Row label="Мин. длина пароля">
            <Sel value={s.password_min_length} onChange={(v) => upd('password_min_length', v)}
              options={[{ label: '6 символов', value: 6 }, { label: '8 символов', value: 8 }, { label: '10 символов', value: 10 }, { label: '12 символов', value: 12 }]}
            />
          </Row>
          <Row label="Двухфакторная аутентификация" description="Обязательная 2FA для всех пользователей">
            <Toggle enabled={s.require_2fa} onChange={(v) => upd('require_2fa', v)} />
          </Row>
        </div>

        {/* ── Локализация ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
          <SectionHeader
            title="Локализация"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.919 17.919 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            }
          />
          <Row label="Язык интерфейса">
            <Sel value={s.language} onChange={(v) => upd('language', v)}
              options={[{ label: 'Русский', value: 'ru' }, { label: 'English', value: 'en' }]}
            />
          </Row>
          <Row label="Формат даты">
            <Sel value={s.date_format} onChange={(v) => upd('date_format', v)}
              options={[{ label: 'ДД.ММ.ГГГГ', value: 'DD.MM.YYYY' }, { label: 'ММ/ДД/ГГГГ', value: 'MM/DD/YYYY' }, { label: 'ГГГГ-ММ-ДД', value: 'YYYY-MM-DD' }]}
            />
          </Row>
          <Row label="Формат времени">
            <Sel value={s.time_format} onChange={(v) => upd('time_format', v)}
              options={[{ label: '24 часа (14:30)', value: '24h' }, { label: '12 часов (2:30 PM)', value: '12h' }]}
            />
          </Row>
          <Row label="Часовой пояс">
            <Sel value={s.timezone} onChange={(v) => upd('timezone', v)}
              options={[
                { label: 'Москва (UTC+3)', value: 'Europe/Moscow' },
                { label: 'Самара (UTC+4)', value: 'Europe/Samara' },
                { label: 'Екатеринбург (UTC+5)', value: 'Asia/Yekaterinburg' },
                { label: 'Новосибирск (UTC+7)', value: 'Asia/Novosibirsk' },
                { label: 'Красноярск (UTC+7)', value: 'Asia/Krasnoyarsk' },
                { label: 'Иркутск (UTC+8)', value: 'Asia/Irkutsk' },
                { label: 'Якутск (UTC+9)', value: 'Asia/Yakutsk' },
                { label: 'Владивосток (UTC+10)', value: 'Asia/Vladivostok' },
                { label: 'Алматы (UTC+6)', value: 'Asia/Almaty' },
                { label: 'Ташкент (UTC+5)', value: 'Asia/Tashkent' },
                { label: 'UTC', value: 'UTC' },
              ]}
            />
          </Row>
          <Row label="Валюта">
            <Sel value={s.currency} onChange={(v) => upd('currency', v)}
              options={[
                { label: '₽ Российский рубль', value: 'RUB' },
                { label: '$ Доллар США', value: 'USD' },
                { label: '€ Евро', value: 'EUR' },
                { label: '₸ Казахстанский тенге', value: 'KZT' },
                { label: 'сум Узбекский сум', value: 'UZS' },
                { label: 'Br Белорусский рубль', value: 'BYN' },
                { label: '₴ Украинская гривна', value: 'UAH' },
              ]}
            />
          </Row>
        </div>

        {/* ── Файлы ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
          <SectionHeader
            title="Файлы и хранилище"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9Z" />
              </svg>
            }
          />
          <Row label="Макс. размер файла" description="Максимальный размер одного загружаемого файла">
            <Sel value={s.max_file_size_mb} onChange={(v) => upd('max_file_size_mb', v)}
              options={[{ label: '5 МБ', value: 5 }, { label: '10 МБ', value: 10 }, { label: '25 МБ', value: 25 }, { label: '50 МБ', value: 50 }, { label: '100 МБ', value: 100 }]}
            />
          </Row>
        </div>

        {/* ── Технические работы ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 xl:col-span-2">
          <SectionHeader
            title="Технические работы"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.654-4.654m5.96-4.66l1.23-1.23c.546-.546.546-1.432 0-1.978L15.5 3.11a1.4 1.4 0 00-1.978 0l-1.23 1.23" />
              </svg>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-1 space-y-1">
              <Row label="Режим обслуживания" description="Все пользователи (кроме супер-админа) видят страницу «Технические работы»">
                <Toggle enabled={s.maintenance_mode} onChange={(v) => upd('maintenance_mode', v)} />
              </Row>
            </div>
            <div className="sm:col-span-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Заголовок страницы</label>
                <input type="text" value={s.maintenance_title} onChange={(e) => upd('maintenance_title', e.target.value)} placeholder="Технические работы" maxLength={100}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Сообщение для пользователей</label>
                <textarea rows={2} value={s.maintenance_message} onChange={(e) => upd('maintenance_message', e.target.value)} placeholder="Ведутся технические работы. Пожалуйста, зайдите позже."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ожидаемое время завершения</label>
                  <input type="datetime-local" value={s.maintenance_end_time ? s.maintenance_end_time.slice(0, 16) : ''}
                    onChange={(e) => upd('maintenance_end_time', e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Контактный email</label>
                  <input type="email" value={s.maintenance_contact_email} onChange={(e) => upd('maintenance_contact_email', e.target.value)} placeholder="support@company.ru"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700/60">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Роли с доступом во время обслуживания</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Супер-администратор всегда имеет доступ. Выберите дополнительные роли, которым разрешён вход.</p>
            <div className="flex flex-wrap gap-2">
              {[
                { code: 'admin', label: 'Админ' },
                { code: 'hr_manager', label: 'HR-менеджер' },
                { code: 'project_manager', label: 'Проект-менеджер' },
                { code: 'foreman', label: 'Прораб' },
                { code: 'accountant', label: 'Бухгалтер' },
                { code: 'inspector', label: 'Инспектор' },
              ].map(({ code, label }) => {
                const active = (s.maintenance_allowed_roles || []).includes(code);
                return (
                  <button key={code} type="button"
                    onClick={() => {
                      const current = s.maintenance_allowed_roles || [];
                      upd('maintenance_allowed_roles', active ? current.filter((r) => r !== code) : [...current, code]);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {s.maintenance_mode && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Режим обслуживания активен. Все пользователи, кроме супер-администратора, видят страницу технических работ.
              </span>
            </div>
          )}
        </div>

      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
