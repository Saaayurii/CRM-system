'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import {
  DOC_TYPES,
  DOC_STATUSES,
  type NormCategory,
  type NormDocumentDetail,
} from '@/lib/wiki/constants';
import { useT } from '@/lib/i18n';

interface Props {
  doc?: NormDocumentDetail | null; // undefined/null → create
  categories: NormCategory[];
  onClose: () => void;
  onSaved: (id: number) => void;
}

function flattenCategoryOptions(cats: NormCategory[]): { id: number; label: string }[] {
  const byParent = new Map<number | null, NormCategory[]>();
  for (const c of cats) {
    const key = c.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }
  const out: { id: number; label: string }[] = [];
  const walk = (parent: number | null, depth: number) => {
    const list = (byParent.get(parent) || []).sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
    );
    for (const c of list) {
      out.push({ id: c.id, label: `${'— '.repeat(depth)}${c.name}` });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function toDateInput(v?: string | null): string {
  if (!v) return '';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export default function NormDocumentModal({ doc, categories, onClose, onSaved }: Props) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const isEdit = !!doc?.id;

  const [title, setTitle] = useState(doc?.title || '');
  const [code, setCode] = useState(doc?.code || '');
  const [docType, setDocType] = useState<string>(doc?.docType || 'snip');
  const [status, setStatus] = useState<string>(doc?.status || 'active');
  const [categoryId, setCategoryId] = useState<string>(doc?.categoryId ? String(doc.categoryId) : '');
  const [effectiveDate, setEffectiveDate] = useState(toDateInput(doc?.effectiveDate));
  const [supersededDate, setSupersededDate] = useState(toDateInput(doc?.supersededDate));
  const [tags, setTags] = useState((doc?.tags || []).join(', '));
  const [summary, setSummary] = useState(doc?.summary || '');
  const [content, setContent] = useState(doc?.content || '');
  const [keywords, setKeywords] = useState(doc?.keywords || '');
  const [attachments, setAttachments] = useState(
    (doc?.attachments || []).map((a) => a.url).join('\n'),
  );
  const [saving, setSaving] = useState(false);

  const catOptions = flattenCategoryOptions(categories);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    if (!title.trim()) {
      addToast('error', 'Укажите название документа');
      return;
    }
    setSaving(true);
    const payload: any = {
      title: title.trim(),
      code: code.trim() || undefined,
      docType,
      status,
      categoryId: categoryId ? Number(categoryId) : undefined,
      effectiveDate: effectiveDate || undefined,
      supersededDate: supersededDate || undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      summary: summary.trim() || undefined,
      content: content || undefined,
      keywords: keywords.trim() || undefined,
      attachments: attachments
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url) => ({ url, name: url.split('/').pop() || url })),
    };
    try {
      let id = doc?.id;
      if (isEdit) {
        await api.put(`/norm-documents/${doc!.id}`, payload);
      } else {
        const { data } = await api.post('/norm-documents', payload);
        id = data?.id ?? data?.data?.id;
      }
      addToast('success', isEdit ? 'Документ обновлён' : 'Документ создан');
      onSaved(id as number);
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Не удалось сохранить документ');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
  const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onMouseDown={onClose}>
      <div
        className="w-full max-w-3xl my-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold">{isEdit ? 'Редактировать документ' : 'Новый документ'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className={labelCls}>{t('Название *')}</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Организация строительного производства')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('Обозначение (код)')}</label>
              <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('СП 48.13330.2019')} />
            </div>
            <div>
              <label className={labelCls}>{t('Тип')}</label>
              <select className={inputCls} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('Категория')}</label>
              <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">{t('— без категории —')}</option>
                {catOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('Статус актуальности')}</label>
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                {DOC_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('Дата вступления в силу')}</label>
              <input type="date" className={inputCls} value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('Дата отмены (если устарел)')}</label>
              <input type="date" className={inputCls} value={supersededDate} onChange={(e) => setSupersededDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('Теги (через запятую)')}</label>
            <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('бетон, фундамент, СМР')} />
          </div>

          <div>
            <label className={labelCls}>{t('Краткое описание')}</label>
            <textarea className={inputCls} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t('О чём документ в одну-две строки')} />
          </div>

          <div>
            <label className={labelCls}>{t('Содержание (Markdown)')}</label>
            <textarea
              className={`${inputCls} font-mono text-[13px]`}
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={'## Раздел 1. Общие положения\n\n- Пункт 1\n- Пункт 2\n\n**Важно:** ...'}
            />
            <p className="mt-1 text-xs text-gray-400">{t('Поддерживаются заголовки #, списки, таблицы, **жирный**, *курсив*, `код`, ссылки.')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('Ключевые слова (для поиска)')}</label>
              <input className={inputCls} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder={t('дополнительные термины')} />
            </div>
            <div>
              <label className={labelCls}>{t('Вложения (URL, по одному в строке)')}</label>
              <textarea className={inputCls} rows={2} value={attachments} onChange={(e) => setAttachments(e.target.value)} placeholder="/uploads/sp-48.pdf" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">{t('Отмена')}</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50">
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
