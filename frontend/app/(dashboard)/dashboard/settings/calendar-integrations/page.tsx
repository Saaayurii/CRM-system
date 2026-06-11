'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

interface Integration {
  id: number;
  provider: 'google' | 'yandex' | 'apple' | string;
  displayName?: string;
  externalAccount?: string;
  externalCalendarId?: string;
  syncDirection?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
  isActive: boolean;
  createdAt?: string;
}

interface ProvidersInfo {
  google: { configured: boolean; scopes: string[] };
  yandex: { configured: boolean; caldavUrl: string };
  apple: { configured: boolean; caldavUrl: string };
}

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google Calendar',
  yandex: 'Яндекс Календарь',
  apple: 'Apple Календарь',
};

const PROVIDER_HELP: Record<string, string> = {
  yandex: 'Сгенерируйте пароль приложения в id.yandex.ru → Безопасность → Пароли приложений → CalDAV',
  apple:  'Сгенерируйте app-specific password в appleid.apple.com → Sign-In and Security → App-Specific Passwords',
  generic:'Используйте URL вашего CalDAV-сервера, логин и пароль приложения',
};

export default function CalendarIntegrationsPage() {
  const t = useT();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [providers, setProviders] = useState<ProvidersInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showCalDav, setShowCalDav] = useState<'yandex' | 'apple' | 'generic' | null>(null);
  const [form, setForm] = useState({ username: '', password: '', url: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [iRes, pRes] = await Promise.all([
        api.get<Integration[]>('/calendar-integrations'),
        api.get<ProvidersInfo>('/calendar-integrations/providers'),
      ]);
      setIntegrations(Array.isArray(iRes.data) ? iRes.data : []);
      setProviders(pRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('status') === 'connected') {
        history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const { data } = await api.get<{ url: string }>('/calendar-integrations/google/auth-url');
      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Не удалось открыть авторизацию Google');
    }
  };

  const handleConnectCalDav = async () => {
    if (!showCalDav) return;
    setFormError(null);
    try {
      await api.post('/calendar-integrations/caldav', {
        provider: showCalDav,
        username: form.username,
        password: form.password,
        url: form.url || undefined,
      });
      setShowCalDav(null);
      setForm({ username: '', password: '', url: '' });
      await load();
    } catch (e: any) {
      setFormError(e?.response?.data?.message || 'Не удалось подключить');
    }
  };

  const handleSync = async (id: number) => {
    setBusyId(id);
    try {
      await api.post(`/calendar-integrations/${id}/sync`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Ошибка синхронизации');
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm('Отключить интеграцию?')) return;
    setBusyId(id);
    try {
      await api.delete(`/calendar-integrations/${id}`);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Интеграции календаря')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Подключите внешние календари, чтобы события CRM появлялись в Google / Яндекс / Apple, а ваши встречи — в CRM.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ProviderCard
          name="Google Calendar"
          subtitle={t('OAuth 2.0 • двусторонняя')}
          enabled={!!providers?.google.configured}
          disabledHint="Сервер: задайте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET"
          onClick={handleConnectGoogle}
          accent="#ea4335"
        />
        <ProviderCard
          name="Яндекс Календарь"
          subtitle={t('CalDAV • двусторонняя')}
          enabled
          onClick={() => setShowCalDav('yandex')}
          accent="#ffcc00"
        />
        <ProviderCard
          name="Apple Календарь"
          subtitle="CalDAV (iCloud)"
          enabled
          onClick={() => setShowCalDav('apple')}
          accent="#000000"
        />
      </div>

      <h2 className="text-lg font-semibold mb-3">{t('Подключения')}</h2>
      {loading ? (
        <div className="text-sm text-gray-500">{t('Загрузка…')}</div>
      ) : integrations.length === 0 ? (
        <div className="text-sm text-gray-500 rounded-md border border-dashed border-gray-200 dark:border-gray-700 p-4">
          Пока нет подключений
        </div>
      ) : (
        <div className="space-y-3">
          {integrations.map((it) => (
            <div
              key={it.id}
              className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-gray-100">
                  {PROVIDER_LABEL[it.provider] || it.provider} • {it.externalAccount}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Направление: {it.syncDirection || 'bidirectional'} ·
                  Последняя синхр.: {it.lastSyncAt ? new Date(it.lastSyncAt).toLocaleString('ru-RU') : '—'}
                  {it.lastSyncStatus && ` · статус: ${it.lastSyncStatus}`}
                </div>
                {it.lastSyncError && (
                  <div className="text-xs text-red-500 mt-1">Ошибка: {it.lastSyncError}</div>
                )}
              </div>
              <button
                disabled={busyId === it.id}
                onClick={() => handleSync(it.id)}
                className="px-3 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Синхронизировать
              </button>
              <button
                disabled={busyId === it.id}
                onClick={() => handleDisconnect(it.id)}
                className="px-3 py-1 text-sm rounded border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Отключить
              </button>
            </div>
          ))}
        </div>
      )}

      {showCalDav && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCalDav(null)}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-5"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Подключить {PROVIDER_LABEL[showCalDav]}</h3>
            <p className="text-xs text-gray-500 mb-4">{PROVIDER_HELP[showCalDav]}</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder={t('Email / логин')}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              />
              <input
                type="password"
                placeholder={t('Пароль приложения')}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              />
              {showCalDav === 'generic' && (
                <input
                  type="url"
                  placeholder="CalDAV URL"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                />
              )}
              {formError && <div className="text-xs text-red-500">{formError}</div>}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setShowCalDav(null)} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700">
                Отмена
              </button>
              <button onClick={handleConnectCalDav} className="px-3 py-1.5 text-sm rounded-md bg-violet-500 text-white hover:bg-violet-600">
                Подключить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  name, subtitle, enabled, disabledHint, accent, onClick,
}: {
  name: string;
  subtitle: string;
  enabled: boolean;
  disabledHint?: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      className={`text-left rounded-xl border p-4 transition ${
        enabled
          ? 'border-gray-200 dark:border-gray-700 hover:shadow-md bg-white dark:bg-gray-800'
          : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 opacity-70 cursor-not-allowed'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: accent }} />
        <span className="font-medium text-gray-800 dark:text-gray-100">{name}</span>
      </div>
      <div className="text-xs text-gray-500">{subtitle}</div>
      {!enabled && disabledHint && (
        <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">{disabledHint}</div>
      )}
    </button>
  );
}
