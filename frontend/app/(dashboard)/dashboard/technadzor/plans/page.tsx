'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface SitePlan {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  projectId?: number;
  width?: number;
  height?: number;
  _count?: { defects: number };
}

interface ProjectOption {
  id: number;
  name: string;
}

export default function PlansPage() {
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

  const [plans, setPlans] = useState<SitePlan[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/site-plans');
      setPlans(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      addToast('error', 'Не удалось загрузить планы');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
    api
      .get('/projects')
      .then(({ data }) => {
        const arr = Array.isArray(data) ? data : data?.data ?? [];
        setProjects(arr.map((p: any) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, [load]);

  const readImageSize = (f: File) =>
    new Promise<{ width?: number; height?: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({});
      img.src = URL.createObjectURL(f);
    });

  const createPlan = async () => {
    if (!title.trim() || !file) {
      addToast('error', 'Укажите название и выберите изображение плана');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('files', file);
      const { data: uploaded } = await api.post('/inspections/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const up = Array.isArray(uploaded) ? uploaded[0] : null;
      if (!up?.fileUrl) throw new Error('upload failed');
      const size = await readImageSize(file);
      await api.post('/site-plans', {
        title: title.trim(),
        imageUrl: up.fileUrl,
        projectId: projectId ? Number(projectId) : undefined,
        width: size.width,
        height: size.height,
      });
      addToast('success', 'План добавлен');
      setModalOpen(false);
      setTitle('');
      setProjectId('');
      setFile(null);
      load();
    } catch {
      addToast('error', 'Не удалось создать план');
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: number) => {
    if (!confirm('Удалить план? Дефекты сохранятся, но потеряют привязку к точке.')) return;
    try {
      await api.delete(`/site-plans/${id}`);
      setPlans((p) => p.filter((x) => x.id !== id));
    } catch {
      addToast('error', 'Не удалось удалить план');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Планы и чертежи
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Разметка дефектов точками на плане объекта
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
        >
          + Загрузить план
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Загрузка…</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-sm">Планов пока нет.</p>
          <p className="text-xs mt-1">Загрузите чертёж этажа, фасада или разреза, чтобы расставлять на нём дефекты.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className="group relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:shadow-md transition cursor-pointer"
              onClick={() => router.push(`/dashboard/technadzor/plans/${p.id}`)}
            >
              <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.title} className="w-full h-full object-contain" />
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {p.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Дефектов: {p._count?.defects ?? 0}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePlan(p.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs px-2 py-1"
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Новый план
            </h2>
            <label className="block text-xs text-gray-500 mb-1">Название *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Этаж 1, осей 1–8"
              className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-gray-100"
            />
            <label className="block text-xs text-gray-500 mb-1">Проект</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">— не выбран —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <label className="block text-xs text-gray-500 mb-1">Изображение плана *</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full mb-4 text-sm text-gray-700 dark:text-gray-300"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={createPlan}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Сохранение…' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
