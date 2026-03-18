'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import api from '@/lib/api';
import { normalizeFileUrl } from '@/lib/utils';

// Roles that can NOT manage own personal documents
const ROLES_NO_DOCS = new Set([13, 14]); // observer, analyst

const DOC_TYPES = [
  'Паспорт', 'СНИЛС', 'ИНН', 'Водительское удостоверение',
  'Диплом', 'Сертификат', 'Медицинская книжка', 'Трудовой договор', 'Другое',
];

interface MyDocument {
  id: number;
  documentType?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  fileUrl?: string;
  notes?: string;
  createdAt: string;
}

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

  const canManageDocs = !ROLES_NO_DOCS.has(user?.roleId ?? 0);

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

  // My documents state
  const [myDocs, setMyDocs] = useState<MyDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    documentType: '',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    issuingAuthority: '',
    notes: '',
    fileUrl: '',
  });
  const [docFileUploading, setDocFileUploading] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

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
          setAvatarPreview(normalizeFileUrl(data.avatarUrl));
        }
      } catch {
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

  const fetchMyDocs = async () => {
    setDocsLoading(true);
    try {
      const { data } = await api.get('/employee-documents/my');
      setMyDocs(data.data ?? data ?? []);
    } catch {
      // silent
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (canManageDocs) fetchMyDocs();
  }, [canManageDocs]);

  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFileUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/employee-documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocForm((f) => ({ ...f, fileUrl: data.fileUrl }));
      addToast('success', 'Файл загружен');
    } catch {
      addToast('error', 'Ошибка загрузки файла');
    } finally {
      setDocFileUploading(false);
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocSaving(true);
    try {
      await api.post('/employee-documents', {
        documentType: docForm.documentType || undefined,
        documentNumber: docForm.documentNumber || undefined,
        issueDate: docForm.issueDate || undefined,
        expiryDate: docForm.expiryDate || undefined,
        issuingAuthority: docForm.issuingAuthority || undefined,
        notes: docForm.notes || undefined,
        fileUrl: docForm.fileUrl || undefined,
      });
      addToast('success', 'Документ добавлен');
      setShowAddDoc(false);
      setDocForm({ documentType: '', documentNumber: '', issueDate: '', expiryDate: '', issuingAuthority: '', notes: '', fileUrl: '' });
      if (docFileRef.current) docFileRef.current.value = '';
      fetchMyDocs();
    } catch {
      addToast('error', 'Ошибка при сохранении документа');
    } finally {
      setDocSaving(false);
    }
  };

  const handleDeleteDoc = async (id: number) => {
    setDeletingDocId(id);
    try {
      await api.delete(`/employee-documents/my/${id}`);
      setMyDocs((prev) => prev.filter((d) => d.id !== id));
      addToast('success', 'Документ удалён');
    } catch {
      addToast('error', 'Ошибка при удалении');
    } finally {
      setDeletingDocId(null);
    }
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ru-RU');
  };

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
      <form onSubmit={handlePasswordSubmit} className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-6 mb-6">
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

      {/* My Documents */}
      {canManageDocs && (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Мои документы</h2>
            <button
              onClick={() => setShowAddDoc((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Добавить
            </button>
          </div>

          {/* Add document form */}
          {showAddDoc && (
            <form onSubmit={handleAddDoc} className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Тип документа</label>
                  <select
                    value={docForm.documentType}
                    onChange={(e) => setDocForm((f) => ({ ...f, documentType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">— Выберите —</option>
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Серия / Номер</label>
                  <input
                    type="text"
                    value={docForm.documentNumber}
                    onChange={(e) => setDocForm((f) => ({ ...f, documentNumber: e.target.value }))}
                    placeholder="1234 567890"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Дата выдачи</label>
                  <input
                    type="date"
                    value={docForm.issueDate}
                    onChange={(e) => setDocForm((f) => ({ ...f, issueDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Действителен до</label>
                  <input
                    type="date"
                    value={docForm.expiryDate}
                    onChange={(e) => setDocForm((f) => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Кем выдан</label>
                  <input
                    type="text"
                    value={docForm.issuingAuthority}
                    onChange={(e) => setDocForm((f) => ({ ...f, issuingAuthority: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Файл документа</label>
                  <div className="flex items-center gap-3">
                    <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${docFileUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {docFileUploading ? 'Загрузка...' : 'Прикрепить файл'}
                      <input ref={docFileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleDocFileChange} disabled={docFileUploading} />
                    </label>
                    {docForm.fileUrl && (
                      <a href={docForm.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-500 hover:text-violet-600 truncate max-w-[200px]">
                        Открыть файл
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowAddDoc(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Отмена
                </button>
                <button type="submit" disabled={docSaving || docFileUploading} className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {docSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          )}

          {/* Documents table */}
          {docsLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Загрузка...</p>
          ) : myDocs.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">Документы не добавлены</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Тип</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Номер</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Дата выдачи</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">До</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Файл</th>
                    <th className="py-2 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {myDocs.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-2.5 px-3 text-gray-800 dark:text-gray-200">{doc.documentType || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{doc.documentNumber || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{fmtDate(doc.issueDate)}</td>
                      <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{fmtDate(doc.expiryDate)}</td>
                      <td className="py-2.5 px-3">
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-500 hover:text-violet-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            Открыть
                          </a>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          disabled={deletingDocId === doc.id}
                          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 transition-colors"
                          title="Удалить"
                        >
                          {deletingDocId === doc.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
