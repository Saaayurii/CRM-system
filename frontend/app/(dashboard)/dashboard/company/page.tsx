'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

interface AccountData {
  id: number;
  name: string;
  subdomain: string;
  settings: { logoUrl?: string } | null;
  status: string;
}

export default function CompanyPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const addToast = useToastStore((st) => st.addToast);

  const [account, setAccount] = useState<AccountData | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
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
      setLogoUrl(data.settings?.logoUrl || '');
    } catch {
      addToast('error', 'Не удалось загрузить данные компании');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    formData.append('file', files[0]);
    try {
      setUploadingLogo(true);
      const { data } = await api.post('/users/avatar/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoUrl(data.fileUrl || data.url || '');
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
      await api.put('/system-settings', {
        name: companyName,
        settings: { logoUrl },
      });
      addToast('success', 'Данные компании сохранены');
    } catch {
      addToast('error', 'Не удалось сохранить');
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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">Компания</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Профиль вашей организации</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6 space-y-6">
        {/* Logo */}
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Логотип" className="w-full h-full object-contain" />
            ) : (
              <svg className="w-9 h-9 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Логотип компании</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">PNG, JPG до 5 МБ. Рекомендуется квадратное изображение.</p>
            <div className="flex items-center gap-2">
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
                {uploadingLogo ? 'Загрузка...' : 'Загрузить'}
              </button>
              {logoUrl && (
                <button onClick={() => setLogoUrl('')} className="text-xs text-red-500 hover:text-red-600 transition-colors">
                  Удалить
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700/60 pt-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Название компании
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Info */}
          {account && (
            <div className="grid grid-cols-3 gap-4 pt-1">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">ID аккаунта</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{account.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Поддомен</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{account.subdomain || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Статус</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{account.status}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
