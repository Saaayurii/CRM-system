'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import api from '@/lib/api';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  position: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useToastStore((s) => s.addToast);

  const [profile, setProfile] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    position: '',
  });
  const [password, setPassword] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/users/${user.id}`);
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          position: data.position || '',
        });
        if (data.avatarUrl) {
          setAvatarPreview(data.avatarUrl);
        }
      } catch {
        // use auth store data as fallback
        setProfile({
          name: user.name || '',
          email: user.email || '',
          phone: '',
          position: '',
        });
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, [user?.id, user?.name, user?.email]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data: uploadData } = await api.post('/users/avatar/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl: string = uploadData.fileUrl;

      await api.put(`/users/${user.id}`, { avatarUrl: fileUrl });
      setAvatarPreview(fileUrl);
      updateUser({ avatarUrl: fileUrl });
      addToast('success', 'Аватар обновлён');
    } catch {
      addToast('error', 'Ошибка при загрузке аватара');
      setAvatarPreview(user.avatarUrl ?? null);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setProfileLoading(true);
    try {
      await api.put(`/users/${user.id}`, {
        name: profile.name,
        phone: profile.phone || undefined,
        position: profile.position || undefined,
      });
      addToast('success', 'Профиль обновлён');
    } catch {
      addToast('error', 'Ошибка при обновлении профиля');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (password.newPassword !== password.confirmPassword) {
      addToast('error', 'Пароли не совпадают');
      return;
    }
    if (password.newPassword.length < 6) {
      addToast('error', 'Пароль должен содержать минимум 6 символов');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put(`/users/${user.id}/password`, {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      addToast('success', 'Пароль изменён');
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ошибка при смене пароля';
      addToast('error', msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold mb-8">
        Личные настройки
      </h1>

      {/* Avatar section */}
      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Аватар</h2>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full bg-violet-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (profile.name || profile.email || 'U').charAt(0).toUpperCase()
            )}
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <label className={`cursor-pointer inline-flex items-center px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {avatarUploading ? 'Загрузка...' : 'Загрузить фото'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={avatarUploading}
                onChange={handleAvatarChange}
              />
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG. Макс. 2MB</p>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleProfileSubmit} className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Профиль</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Должность</label>
            <input
              type="text"
              value={profile.position}
              onChange={(e) => setProfile({ ...profile, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={profileLoading}
            className="px-6 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {profileLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>

      {/* Password change */}
      <form onSubmit={handlePasswordSubmit} className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Смена пароля</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Текущий пароль</label>
            <input
              type="password"
              value={password.currentPassword}
              onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Новый пароль</label>
            <input
              type="password"
              value={password.newPassword}
              onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Подтверждение пароля</label>
            <input
              type="password"
              value={password.confirmPassword}
              onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={passwordLoading}
            className="px-6 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {passwordLoading ? 'Сохранение...' : 'Изменить пароль'}
          </button>
        </div>
      </form>
    </div>
  );
}
