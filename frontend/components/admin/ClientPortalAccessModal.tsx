'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface Project {
  id: number;
  name: string;
}

interface Props {
  clientId: number | null;
  clientName?: string;
  onClose: () => void;
}

interface CreatedAccess {
  id: number;
  accessToken: string | null;
  login: string | null;
}

function randomPassword(len = 14): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#%&*+-_';
  let out = '';
  const crypto = typeof window !== 'undefined' ? window.crypto : undefined;
  for (let i = 0; i < len; i++) {
    const idx = crypto
      ? crypto.getRandomValues(new Uint32Array(1))[0] % alphabet.length
      : Math.floor(Math.random() * alphabet.length);
    out += alphabet[idx];
  }
  return out;
}

export default function ClientPortalAccessModal({ clientId, clientName, onClose }: Props) {
  const addToast = useToastStore((s) => s.addToast);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState(() => randomPassword());
  const [canViewProgress, setCanViewProgress] = useState(true);
  const [canViewPhotos, setCanViewPhotos] = useState(true);
  const [canViewDocuments, setCanViewDocuments] = useState(true);
  const [canViewFinancials, setCanViewFinancials] = useState(false);
  const [createChat, setCreateChat] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedAccess | null>(null);

  useEffect(() => {
    if (clientId == null) return;
    api
      .get('/projects', { params: { limit: 100 } })
      .then(({ data }) => {
        const list: Project[] = data?.projects || data?.data || data || [];
        setProjects(list);
      })
      .catch(() => setProjects([]));
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !projectId) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/client-portal-access', {
        clientId,
        projectId: Number(projectId),
        login: login || undefined,
        password: password || undefined,
        canViewProgress,
        canViewPhotos,
        canViewDocuments,
        canViewFinancials,
        createChat,
      });
      setCreated({
        id: data.id,
        accessToken: data.accessToken ?? null,
        login: data.login ?? login ?? null,
      });
      addToast('success', 'Доступ к порталу выдан');
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Не удалось выдать доступ');
    } finally {
      setSubmitting(false);
    }
  };

  const magicLink = created?.accessToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/magic?token=${created.accessToken}`
    : null;

  if (clientId == null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Доступ к порталу {clientName ? `— ${clientName}` : ''}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {!created ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Проект
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="">— Выберите проект —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Логин
                </label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="client@acme.com"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Пароль
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(randomPassword())}
                    className="px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Сгенерировать"
                  >
                    🎲
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Логин не обязателен — если оставить пустым, клиент сможет войти только по магической ссылке.
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={canViewProgress} onChange={(e) => setCanViewProgress(e.target.checked)} />
                Прогресс работ
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={canViewPhotos} onChange={(e) => setCanViewPhotos(e.target.checked)} />
                Фотоотчёт
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={canViewDocuments} onChange={(e) => setCanViewDocuments(e.target.checked)} />
                Документы и акты
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={canViewFinancials} onChange={(e) => setCanViewFinancials(e.target.checked)} />
                Финансовые отчёты
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={createChat} onChange={(e) => setCreateChat(e.target.checked)} />
                Создать отдельный чат-канал
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting || !projectId}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-medium"
              >
                {submitting ? 'Создаём...' : 'Выдать доступ'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 text-sm text-emerald-800 dark:text-emerald-200">
              Доступ создан. Передайте клиенту реквизиты ниже.
            </div>

            {created.login && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Логин</label>
                <code className="block px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-sm">{created.login}</code>
              </div>
            )}
            {password && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Пароль (не покажется снова)</label>
                <code className="block px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono">{password}</code>
              </div>
            )}
            {magicLink && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Magic-ссылка для входа</label>
                <div className="flex gap-1">
                  <code className="flex-1 px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-xs break-all">
                    {magicLink}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(magicLink);
                      addToast('success', 'Ссылка скопирована');
                    }}
                    className="px-3 py-2 rounded bg-violet-600 hover:bg-violet-700 text-white text-xs"
                  >
                    Копировать
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
              >
                Готово
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
