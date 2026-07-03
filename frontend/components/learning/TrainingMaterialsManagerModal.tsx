'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

type MaterialType = 'video' | 'article' | 'instruction' | 'checklist' | 'presentation' | string;

interface TrainingMaterial {
  id: number;
  title: string;
  materialType?: MaterialType;
  content?: string;
  fileUrl?: string;
  coverUrl?: string;
  category?: string;
  difficultyLevel?: string;
  durationMinutes?: number;
  description?: string;
  tags?: unknown;
  isPublished?: boolean;
  isMandatory?: boolean;
  targetRoleIds?: number[] | unknown;
  viewCount?: number;
  createdAt?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
  initialMode?: 'list' | 'create';
}

const TYPE_META: Record<string, { label: string; emoji: string; badge: string; gradient: string }> = {
  video:        { label: 'Видео',       emoji: '▶',  badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', gradient: 'from-purple-500/30 to-fuchsia-500/30' },
  article:      { label: 'Статья',      emoji: '📄', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         gradient: 'from-blue-500/30 to-sky-500/30' },
  instruction:  { label: 'Инструкция',  emoji: '📋', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', gradient: 'from-orange-500/30 to-amber-500/30' },
  checklist:    { label: 'Чек-лист',    emoji: '✅', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',     gradient: 'from-emerald-500/30 to-teal-500/30' },
  presentation: { label: 'Презентация', emoji: '🖼', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', gradient: 'from-yellow-500/30 to-orange-500/30' },
};

const DIFFICULTY_META: Record<string, { label: string; badge: string }> = {
  beginner:     { label: 'Начальный',   badge: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  intermediate: { label: 'Средний',     badge: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  advanced:     { label: 'Продвинутый', badge: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const ROLES: { id: number; label: string }[] = [
  { id: 1, label: 'Супер-админ' },
  { id: 2, label: 'Админ' },
  { id: 3, label: 'HR' },
  { id: 4, label: 'PM' },
  { id: 5, label: 'Прораб' },
  { id: 6, label: 'Снабженец' },
  { id: 7, label: 'Кладовщик' },
  { id: 8, label: 'Бухгалтер' },
  { id: 9, label: 'Инспектор' },
  { id: 10, label: 'Рабочий' },
];

type Mode = 'list' | 'form';

interface FormState {
  id?: number;
  title: string;
  materialType: string;
  category: string;
  difficultyLevel: string;
  durationMinutes: string;
  description: string;
  content: string;
  fileUrl: string;
  coverUrl: string;
  tagsCsv: string;
  targetRoleIds: number[];
  isMandatory: boolean;
  isPublished: boolean;
}

const EMPTY_FORM: FormState = {
  title: '',
  materialType: 'article',
  category: '',
  difficultyLevel: 'beginner',
  durationMinutes: '',
  description: '',
  content: '',
  fileUrl: '',
  coverUrl: '',
  tagsCsv: '',
  targetRoleIds: [],
  isMandatory: false,
  isPublished: true,
};

export default function TrainingMaterialsManagerModal({ open, onClose, onChanged, initialMode = 'list' }: Props) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);

  const [mode, setMode] = useState<Mode>('list');
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'published' | 'draft' | 'mandatory'>('');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/training-materials', { params: { page: 1, limit: 500 } });
      const arr: TrainingMaterial[] = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
      setMaterials(arr);
    } catch {
      addToast('error', 'Не удалось загрузить материалы');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode === 'create' ? 'form' : 'list');
    if (initialMode === 'create') {
      setForm({ ...EMPTY_FORM });
    }
    fetchAll();
  }, [open, initialMode, fetchAll]);

  // ESC to close (or back to list)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'form') setMode('list');
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mode, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const stats = useMemo(() => {
    let published = 0, drafts = 0, mandatory = 0;
    materials.forEach((m) => {
      if (m.isPublished) published += 1; else drafts += 1;
      if (m.isMandatory) mandatory += 1;
    });
    return { total: materials.length, published, drafts, mandatory };
  }, [materials]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (typeFilter && m.materialType !== typeFilter) return false;
      if (statusFilter === 'published' && !m.isPublished) return false;
      if (statusFilter === 'draft' && m.isPublished) return false;
      if (statusFilter === 'mandatory' && !m.isMandatory) return false;
      if (s) {
        const hay = [m.title, m.description, m.category, m.materialType]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    }).toSorted((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }, [materials, search, typeFilter, statusFilter]);

  const startCreate = () => {
    setForm({ ...EMPTY_FORM });
    setMode('form');
  };

  const startEdit = (m: TrainingMaterial) => {
    setForm({
      id: m.id,
      title: m.title ?? '',
      materialType: m.materialType ?? 'article',
      category: m.category ?? '',
      difficultyLevel: m.difficultyLevel ?? 'beginner',
      durationMinutes: m.durationMinutes ? String(m.durationMinutes) : '',
      description: m.description ?? '',
      content: m.content ?? '',
      fileUrl: m.fileUrl ?? '',
      coverUrl: m.coverUrl ?? '',
      tagsCsv: Array.isArray(m.tags) ? (m.tags as string[]).join(', ') : '',
      targetRoleIds: Array.isArray(m.targetRoleIds) ? (m.targetRoleIds as number[]) : [],
      isMandatory: !!m.isMandatory,
      isPublished: m.isPublished !== false,
    });
    setMode('form');
  };

  const togglePublish = async (m: TrainingMaterial) => {
    try {
      await api.put(`/training-materials/${m.id}`, { isPublished: !m.isPublished });
      addToast('success', m.isPublished ? 'Снято с публикации' : 'Опубликовано');
      fetchAll();
      onChanged?.();
    } catch {
      addToast('error', 'Не удалось обновить статус');
    }
  };

  const toggleMandatory = async (m: TrainingMaterial) => {
    try {
      await api.put(`/training-materials/${m.id}`, { isMandatory: !m.isMandatory });
      addToast('success', m.isMandatory ? 'Сделано необязательным' : 'Сделано обязательным');
      fetchAll();
      onChanged?.();
    } catch {
      addToast('error', 'Не удалось обновить признак');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/training-materials/${id}`);
      addToast('success', 'Материал удалён');
      setConfirmDeleteId(null);
      fetchAll();
      onChanged?.();
    } catch {
      addToast('error', 'Не удалось удалить материал');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      addToast('error', 'Укажите название');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        materialType: form.materialType || undefined,
        category: form.category.trim() || undefined,
        difficultyLevel: form.difficultyLevel || undefined,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
        description: form.description.trim() || undefined,
        content: form.content.trim() || undefined,
        fileUrl: form.fileUrl.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        tags: form.tagsCsv ? form.tagsCsv.split(',').map((t) => t.trim()).filter(Boolean) : [],
        targetRoleIds: form.targetRoleIds,
        isMandatory: form.isMandatory,
        isPublished: form.isPublished,
      };
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      if (form.id) {
        await api.put(`/training-materials/${form.id}`, payload);
        addToast('success', 'Материал обновлён');
      } else {
        await api.post('/training-materials', payload);
        addToast('success', 'Материал создан');
      }
      await fetchAll();
      onChanged?.();
      setMode('list');
    } catch {
      addToast('error', 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-5xl sm:my-6 mx-auto bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-[92vh] sm:max-h-[900px] animate-[slideUp_220ms_ease-out]">

        {/* Header (gradient) */}
        <div className="relative px-5 sm:px-6 py-4 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {mode === 'form' && (
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="p-1.5 -ml-1 rounded-lg hover:bg-white/15 transition-colors"
                  title={t('Назад к списку')}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold leading-tight truncate">
                  {mode === 'list' ? 'Управление обучением' : form.id ? 'Редактирование материала' : 'Новый материал'}
                </h2>
                <p className="text-xs sm:text-sm text-white/80 mt-0.5 truncate">
                  {mode === 'list'
                    ? 'Создавайте, редактируйте и публикуйте обучающие материалы'
                    : 'Заполните карточку — она сразу появится в библиотеке'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/15 transition-colors shrink-0"
              title={t('Закрыть')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {mode === 'list' && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <HeaderStat label={t('Всего')} value={stats.total} />
              <HeaderStat label={t('Опубликовано')} value={stats.published} accent="green" />
              <HeaderStat label={t('Черновики')} value={stats.drafts} accent="gray" />
              <HeaderStat label={t('Обязательные')} value={stats.mandatory} accent="red" />
            </div>
          )}
        </div>

        {/* Body */}
        {mode === 'list' ? (
          <ListView
            loading={loading}
            search={search}
            setSearch={setSearch}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            filtered={filtered}
            onCreate={startCreate}
            onEdit={startEdit}
            onTogglePublish={togglePublish}
            onToggleMandatory={toggleMandatory}
            onAskDelete={(id) => setConfirmDeleteId(id)}
          />
        ) : (
          <FormView
            form={form}
            setForm={setForm}
            saving={saving}
            onCancel={() => setMode('list')}
            onSubmit={handleSubmit}
          />
        )}

        {/* Delete confirm overlay */}
        {confirmDeleteId !== null && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('Удалить материал?')}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Действие нельзя отменить. Материал и связанный прогресс будут удалены.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white shadow"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── ListView ──────────────────────────────────────────────────────────────

function ListView({
  loading, search, setSearch, typeFilter, setTypeFilter, statusFilter, setStatusFilter,
  filtered, onCreate, onEdit, onTogglePublish, onToggleMandatory, onAskDelete,
}: {
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  statusFilter: '' | 'published' | 'draft' | 'mandatory';
  setStatusFilter: (v: '' | 'published' | 'draft' | 'mandatory') => void;
  filtered: TrainingMaterial[];
  onCreate: () => void;
  onEdit: (m: TrainingMaterial) => void;
  onTogglePublish: (m: TrainingMaterial) => void;
  onToggleMandatory: (m: TrainingMaterial) => void;
  onAskDelete: (id: number) => void;
}) {
  const t = useT();
  return (
    <>
      {/* Toolbar */}
      <div className="px-5 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={t('Поиск по названию, описанию...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-400"
        >
          <option value="">{t('Все типы')}</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | 'published' | 'draft' | 'mandatory')}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-400"
        >
          <option value="">{t('Все статусы')}</option>
          <option value="published">{t('Опубликованные')}</option>
          <option value="draft">{t('Черновики')}</option>
          <option value="mandatory">{t('Обязательные')}</option>
        </select>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg bg-violet-500 hover:bg-violet-600 text-white shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Создать материал
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
        {loading ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📚</div>
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">{t('Материалов не найдено')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('Создайте первый материал или сбросьте фильтры.')}</p>
            <button
              type="button"
              onClick={onCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-violet-500 hover:bg-violet-600 text-white shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Создать материал
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((m) => (
              <Row
                key={m.id}
                material={m}
                onEdit={() => onEdit(m)}
                onTogglePublish={() => onTogglePublish(m)}
                onToggleMandatory={() => onToggleMandatory(m)}
                onDelete={() => onAskDelete(m.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Row({
  material, onEdit, onTogglePublish, onToggleMandatory, onDelete,
}: {
  material: TrainingMaterial;
  onEdit: () => void;
  onTogglePublish: () => void;
  onToggleMandatory: () => void;
  onDelete: () => void;
}) {
  const tl = useT();
  const t = TYPE_META[String(material.materialType ?? '')] ?? {
    label: String(material.materialType ?? '—'),
    emoji: '📚',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    gradient: 'from-gray-300/40 to-gray-400/40',
  };
  const d = material.difficultyLevel ? DIFFICULTY_META[material.difficultyLevel] : null;

  return (
    <li className="group relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-400 dark:hover:border-violet-400 hover:shadow-md transition-all overflow-hidden">
      <div className="flex items-stretch gap-3">
        {/* Cover */}
        <div className={`relative w-20 sm:w-24 shrink-0 bg-gradient-to-br ${t.gradient} flex items-center justify-center overflow-hidden`}>
          {material.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={material.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl opacity-80">{t.emoji}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-3 pr-3">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-1 flex-1 min-w-0">
              {material.title}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${t.badge}`}>
              {t.label}
            </span>
            {material.isMandatory && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-500 text-white">
                Обязательно
              </span>
            )}
            {material.isPublished === false ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                Черновик
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Опубликовано
              </span>
            )}
          </div>

          {material.description && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{material.description}</p>
          )}

          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px] text-gray-500 dark:text-gray-400">
            {d && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded ${d.badge}`}>{d.label}</span>
            )}
            {material.category && <span className="truncate max-w-[120px]">📁 {material.category}</span>}
            {material.durationMinutes ? <span>⏱ {material.durationMinutes} мин</span> : null}
            {typeof material.viewCount === 'number' && <span>👁 {material.viewCount}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pr-3">
          <IconButton title={material.isPublished ? 'Снять с публикации' : 'Опубликовать'} onClick={onTogglePublish}>
            {material.isPublished ? (
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
              </svg>
            )}
          </IconButton>
          <IconButton title={material.isMandatory ? 'Снять обязательность' : 'Сделать обязательным'} onClick={onToggleMandatory}>
            <svg className={`w-4 h-4 ${material.isMandatory ? 'text-red-500' : 'text-gray-400'}`} fill={material.isMandatory ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </IconButton>
          <IconButton title={tl('Редактировать')} onClick={onEdit}>
            <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </IconButton>
          <IconButton title={tl('Удалить')} onClick={onDelete}>
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
          </IconButton>
        </div>
      </div>
    </li>
  );
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
    >
      {children}
    </button>
  );
}

function ListSkeleton() {
  const t = useT();
  return (
    <ul className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden animate-pulse">
          <div className="flex gap-3">
            <div className="w-20 sm:w-24 h-20 bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 py-3 pr-3 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── FormView ──────────────────────────────────────────────────────────────

function FormView({
  form, setForm, saving, onCancel, onSubmit,
}: {
  form: FormState;
  setForm: (next: FormState | ((p: FormState) => FormState)) => void;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const t = useT();
  const titleRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const toggleRole = (id: number) => {
    setForm((p) => ({
      ...p,
      targetRoleIds: p.targetRoleIds.includes(id)
        ? p.targetRoleIds.filter((x) => x !== id)
        : [...p.targetRoleIds, id],
    }));
  };

  return (
    <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: main fields */}
          <div className="lg:col-span-2 space-y-4">
            <Field label={t('Название')} required>
              <input
                ref={titleRef}
                type="text"
                className="form-input w-full"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder={t('Например, «Техника безопасности на стройплощадке»')}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('Тип материала')}>
                <TypePicker value={form.materialType} onChange={(v) => update('materialType', v)} />
              </Field>
              <Field label={t('Уровень сложности')}>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(DIFFICULTY_META).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => update('difficultyLevel', k)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        form.difficultyLevel === k
                          ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('Категория')} hint="Например, «Охрана труда»">
                <input
                  type="text"
                  className="form-input w-full"
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                />
              </Field>
              <Field label={t('Длительность, мин')}>
                <input
                  type="number"
                  min={0}
                  className="form-input w-full"
                  value={form.durationMinutes}
                  onChange={(e) => update('durationMinutes', e.target.value)}
                />
              </Field>
            </div>

            <Field label={t('Краткое описание')} hint="Покажется на карточке в библиотеке">
              <textarea
                className="form-textarea w-full"
                rows={2}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </Field>

            <Field label={t('Содержимое (текст/HTML/Markdown)')} hint="Основной материал, который сотрудник увидит на странице курса">
              <textarea
                className="form-textarea w-full font-mono text-xs"
                rows={6}
                value={form.content}
                onChange={(e) => update('content', e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('Ссылка на файл / видео')} hint="YouTube, PDF, ссылка на хранилище...">
                <input
                  type="url"
                  className="form-input w-full"
                  value={form.fileUrl}
                  onChange={(e) => update('fileUrl', e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <Field label={t('Обложка (URL картинки)')}>
                <input
                  type="url"
                  className="form-input w-full"
                  value={form.coverUrl}
                  onChange={(e) => update('coverUrl', e.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>

            <Field label={t('Теги')} hint="Через запятую — помогают искать материал">
              <input
                type="text"
                className="form-input w-full"
                value={form.tagsCsv}
                onChange={(e) => update('tagsCsv', e.target.value)}
                placeholder={t('безопасность, новички, ОТ')}
              />
            </Field>
          </div>

          {/* Right: settings panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('Публикация')}</h4>
              <SwitchRow
                label={t('Опубликован')}
                hint="Сотрудники видят материал в библиотеке"
                checked={form.isPublished}
                onChange={(v) => update('isPublished', v)}
              />
              <SwitchRow
                label={t('Обязательный')}
                hint="Будет в разделе «Обязательные»"
                checked={form.isMandatory}
                onChange={(v) => update('isMandatory', v)}
                accent="red"
              />
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('Назначить ролям')}</h4>
                {form.targetRoleIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => update('targetRoleIds', [])}
                    className="text-xs text-violet-500 hover:text-violet-600"
                  >
                    Сбросить
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                Если ничего не выбрано — материал доступен всем ролям. Влияет на расчёт «обязательных».
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {ROLES.map((r) => {
                  const active = form.targetRoleIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border text-left transition-colors ${
                        active
                          ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      <span className={`inline-block w-3.5 h-3.5 mr-1.5 align-middle rounded-sm border ${active ? 'border-violet-500 bg-violet-500' : 'border-gray-300 dark:border-gray-600'}`}>
                        {active && (
                          <svg viewBox="0 0 24 24" className="w-full h-full text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {form.coverUrl && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50/60 dark:bg-gray-900/40">{t('Превью обложки')}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.coverUrl} alt="" className="w-full h-32 object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
          {form.id ? `ID: ${form.id}` : 'Новый материал'}
        </p>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving || !form.title.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-violet-500 hover:bg-violet-600 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Сохранение...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {form.id ? 'Сохранить изменения' : 'Создать материал'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

function TypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
      {Object.entries(TYPE_META).map(([k, v]) => {
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg border text-xs transition-colors ${
              active
                ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
            }`}
            title={v.label}
          >
            <span className="text-base">{v.emoji}</span>
            <span className="truncate max-w-full">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SwitchRow({ label, hint, checked, onChange, accent }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; accent?: 'red' }) {
  const t = useT();
  const onColor = accent === 'red' ? 'bg-red-500' : 'bg-violet-500';
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors ${checked ? onColor : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        {hint && <span className="block text-[11px] text-gray-500 dark:text-gray-400">{hint}</span>}
      </span>
    </label>
  );
}

function HeaderStat({ label, value, accent = 'default' }: { label: string; value: number; accent?: 'default' | 'green' | 'gray' | 'red' }) {
  const t = useT();
  const color = {
    default: 'text-white',
    green:   'text-emerald-200',
    gray:    'text-white/80',
    red:     'text-rose-200',
  }[accent];
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
      <div className={`text-xl font-bold leading-tight ${color}`}>{value}</div>
      <div className="text-[10px] text-white/75 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}
