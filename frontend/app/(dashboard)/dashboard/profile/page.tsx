'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.5-4.225M9.878 9.878a3 3 0 104.243 4.243M9.878 9.878L3 3m6.878 6.878l4.243 4.243M21 21l-6.122-6.122" />
    </svg>
  );
}

function PasswordField({ label, value, onChange, autoComplete, labelCls, inputCls }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  labelCls: string;
  inputCls: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`${inputCls} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          tabIndex={-1}
          title={show ? 'Скрыть пароль' : 'Показать пароль'}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useToastStore((s) => s.addToast);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    api
      .get(`/users/${user.id}`)
      .then(({ data }) => {
        setName(data.name || user.name || '');
        setPhone(data.phone || '');
      })
      .catch(() => {
        setName(user.name || '');
        setPhone(user.phone || '');
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!name.trim()) {
      addToast('error', 'Укажите имя');
      return;
    }
    setSavingProfile(true);
    try {
      await api.put(`/users/${user.id}`, { name: name.trim(), phone: phone.trim() || undefined });
      updateUser({ name: name.trim(), phone: phone.trim() });
      addToast('success', 'Профиль обновлён');
    } catch {
      addToast('error', 'Не удалось сохранить профиль');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (newPassword.length < 6) {
      addToast('error', 'Новый пароль — минимум 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('error', 'Пароли не совпадают');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put(`/users/${user.id}/password`, { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('success', 'Пароль изменён');
    } catch {
      addToast('error', 'Не удалось изменить пароль (проверьте текущий)');
    } finally {
      setSavingPassword(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Мой профиль')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Личные данные и пароль для входа.')}</p>
      </div>

      {/* Профиль */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">{t('Личные данные')}</h2>
        <div>
          <label className={labelCls}>{t('Имя')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder={t('Фамилия Имя Отчество')} />
        </div>
        <div>
          <label className={labelCls}>{t('Телефон')}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+7…" />
        </div>
        <div>
          <label className={labelCls}>{t('Email (логин)')}</label>
          <input value={user?.email || ''} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
          <p className="mt-1 text-xs text-gray-400">{t('Email менять нельзя — это ваш логин. Обратитесь к менеджеру.')}</p>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={savingProfile} className="px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {savingProfile ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>

      {/* Пароль */}
      <form onSubmit={handleChangePassword} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">{t('Смена пароля')}</h2>
        <PasswordField label={t('Текущий пароль')} value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" labelCls={labelCls} inputCls={inputCls} />
        <PasswordField label={t('Новый пароль')} value={newPassword} onChange={setNewPassword} autoComplete="new-password" labelCls={labelCls} inputCls={inputCls} />
        <PasswordField label={t('Повторите новый пароль')} value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" labelCls={labelCls} inputCls={inputCls} />
        <div className="flex justify-end">
          <button type="submit" disabled={savingPassword} className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-violet-500 hover:bg-gray-800 dark:hover:bg-violet-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {savingPassword ? 'Сохраняем…' : 'Изменить пароль'}
          </button>
        </div>
      </form>
    </div>
  );
}
