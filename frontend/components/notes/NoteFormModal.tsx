'use client';

import { useEffect, useState } from 'react';
import { useToastStore } from '@/stores/toastStore';
import { Note, NotePayload, NOTE_COLORS, notesApi } from '@/lib/notes';
import { useT } from '@/lib/i18n';

interface Props {
  note?: Note | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Convert an ISO string to a value usable by <input type="datetime-local">. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NoteFormModal({ note, onClose, onSaved }: Props) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [color, setColor] = useState(note?.color || 'yellow');
  const [remindAt, setRemindAt] = useState(toLocalInput(note?.remindAt));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!content.trim()) {
      addToast('warning', 'Введите текст заметки');
      return;
    }
    setSaving(true);
    try {
      const payload: NotePayload = {
        title: title.trim() || undefined,
        content: content.trim(),
        color,
        remindAt: remindAt ? new Date(remindAt).toISOString() : null,
      };
      if (note) {
        await notesApi.update(note.id, payload);
        addToast('success', 'Заметка обновлена');
      } else {
        await notesApi.create(payload);
        addToast('success', 'Заметка создана');
      }
      onSaved();
      onClose();
    } catch {
      addToast('error', 'Не удалось сохранить заметку');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {note ? 'Редактировать заметку' : 'Новая заметка'}
        </h2>

        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t('Заголовок (необязательно)')}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          placeholder={t('Например: Позвонить поставщику')}
          className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />

        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t('Текст')}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder={t('Что нужно сделать / о чём напомнить')}
          className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
        />

        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t('Цвет стикера')}</label>
        <div className="flex gap-2 mb-3">
          {Object.entries(NOTE_COLORS).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              title={cfg.label}
              className={`w-7 h-7 rounded-full ${cfg.swatch} transition ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ${
                color === key ? 'ring-2 ring-gray-700 dark:ring-gray-200' : ''
              }`}
            />
          ))}
        </div>

        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
          Когда напомнить (необязательно)
        </label>
        <input
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-60"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
