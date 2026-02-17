'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface SystemSettings {
  // Notifications
  notifications_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  // Appearance
  theme: 'light' | 'dark' | 'system';
  // Maintenance
  maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_end_time: string;
  // Access
  allow_registration: boolean;
  require_invite: boolean;
  auto_approve_users: boolean;
  // Security
  session_timeout_minutes: number;
  max_login_attempts: number;
  password_min_length: number;
  require_2fa: boolean;
  // Localization
  language: 'ru' | 'en';
  date_format: 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
}

interface AccountData {
  id: number;
  name: string;
  subdomain: string;
  settings: Partial<SystemSettings> | null;
  status: string;
}

const defaults: SystemSettings = {
  notifications_enabled: true,
  email_notifications: true,
  sms_notifications: false,
  push_notifications: true,
  theme: 'system',
  maintenance_mode: false,
  maintenance_message: '',
  maintenance_end_time: '',
  allow_registration: true,
  require_invite: false,
  auto_approve_users: false,
  session_timeout_minutes: 60,
  max_login_attempts: 5,
  password_min_length: 8,
  require_2fa: false,
  language: 'ru',
  date_format: 'DD.MM.YYYY',
};

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
        enabled ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="text-violet-500">{icon}</span>
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        {title}
      </h2>
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700/60 first:border-t-0">
      <div className="pr-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Select<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        const parsed = typeof value === 'number' ? (Number(raw) as T) : (raw as T);
        onChange(parsed);
      }}
      className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
    >
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [s, setS] = useState<SystemSettings>(defaults);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/system-settings');
      const data: AccountData = res.data;
      setAccount(data);
      setCompanyName(data.name || '');
      setS({ ...defaults, ...(data.settings || {}) });
    } catch {
      setError('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await api.put('/system-settings', { name: companyName, settings: s });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  const upd = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
          Настройки приложения
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Глобальные настройки для всех пользователей системы
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
          Настройки успешно сохранены
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ── Общие ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
          <SectionHeader
            title="Общие"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            }
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название компании
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <Row label="Язык интерфейса" description="Язык по умолчанию для всех пользователей">
            <Select
              value={s.language}
              onChange={(v) => upd('language', v)}
              options={[
                { label: 'Русский', value: 'ru' },
                { label: 'English', value: 'en' },
              ]}
            />
          </Row>
          <Row label="Формат даты">
            <Select
              value={s.date_format}
              onChange={(v) => upd('date_format', v)}
              options={[
                { label: 'ДД.ММ.ГГГГ', value: 'DD.MM.YYYY' },
                { label: 'ММ/ДД/ГГГГ', value: 'MM/DD/YYYY' },
                { label: 'ГГГГ-ММ-ДД', value: 'YYYY-MM-DD' },
              ]}
            />
          </Row>
          {account && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 grid grid-cols-3 gap-3 text-xs">
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

        {/* ── Оформление ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
          <SectionHeader
            title="Оформление"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
              </svg>
            }
          />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Принудительная тема для всех
          </p>
          <div className="flex gap-2 flex-wrap">
            {([
              { value: 'system', label: 'Системная', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
                </svg>
              )},
              { value: 'light', label: 'Светлая', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              )},
              { value: 'dark', label: 'Тёмная', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              )},
            ] as const).map((t) => (
              <button
                key={t.value}
                onClick={() => upd('theme', t.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  s.theme === t.value
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            «Системная» — каждый пользователь выбирает тему сам
          </p>
        </div>

        {/* ── Уведомления ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
          <SectionHeader
            title="Уведомления"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
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

        {/* ── Доступ ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
          <SectionHeader
            title="Доступ и регистрация"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            }
          />
          <Row label="Таймаут сессии">
            <Select
              value={s.session_timeout_minutes}
              onChange={(v) => upd('session_timeout_minutes', v)}
              options={[
                { label: '15 минут', value: 15 },
                { label: '30 минут', value: 30 },
                { label: '1 час', value: 60 },
                { label: '2 часа', value: 120 },
                { label: '8 часов', value: 480 },
              ]}
            />
          </Row>
          <Row label="Макс. попыток входа">
            <Select
              value={s.max_login_attempts}
              onChange={(v) => upd('max_login_attempts', v)}
              options={[
                { label: '3 попытки', value: 3 },
                { label: '5 попыток', value: 5 },
                { label: '10 попыток', value: 10 },
              ]}
            />
          </Row>
          <Row label="Мин. длина пароля">
            <Select
              value={s.password_min_length}
              onChange={(v) => upd('password_min_length', v)}
              options={[
                { label: '6 символов', value: 6 },
                { label: '8 символов', value: 8 },
                { label: '10 символов', value: 10 },
                { label: '12 символов', value: 12 },
              ]}
            />
          </Row>
          <Row label="Двухфакторная аутентификация" description="Обязательная 2FA для всех пользователей">
            <Toggle enabled={s.require_2fa} onChange={(v) => upd('require_2fa', v)} />
          </Row>
        </div>

        {/* ── Технические работы ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 xl:col-span-2">
          <SectionHeader
            title="Технические работы"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.96-4.66 1.23-1.23c.546-.546.546-1.432 0-1.978L15.5 3.11a1.4 1.4 0 0 0-1.978 0l-1.23 1.23" />
              </svg>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-1">
              <Row
                label="Режим обслуживания"
                description="Все пользователи (кроме супер-админа) видят страницу «Технические работы»"
              >
                <Toggle enabled={s.maintenance_mode} onChange={(v) => upd('maintenance_mode', v)} />
              </Row>
            </div>

            <div className="sm:col-span-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Сообщение для пользователей
                </label>
                <textarea
                  rows={2}
                  value={s.maintenance_message}
                  onChange={(e) => upd('maintenance_message', e.target.value)}
                  placeholder="Ведутся технические работы. Пожалуйста, зайдите позже."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ожидаемое время завершения
                </label>
                <input
                  type="datetime-local"
                  value={s.maintenance_end_time ? s.maintenance_end_time.slice(0, 16) : ''}
                  onChange={(e) => upd('maintenance_end_time', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
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
          {saving && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>
    </div>
  );
}
