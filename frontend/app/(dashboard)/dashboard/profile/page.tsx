'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

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
        <div>
          <label className={labelCls}>{t('Текущий пароль')}</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} autoComplete="current-password" />
        </div>
        <div>
          <label className={labelCls}>{t('Новый пароль')}</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} autoComplete="new-password" />
        </div>
        <div>
          <label className={labelCls}>{t('Повторите новый пароль')}</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} autoComplete="new-password" />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={savingPassword} className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-violet-500 hover:bg-gray-800 dark:hover:bg-violet-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {savingPassword ? 'Сохраняем…' : 'Изменить пароль'}
          </button>
        </div>
      </form>
    </div>
  );
}
