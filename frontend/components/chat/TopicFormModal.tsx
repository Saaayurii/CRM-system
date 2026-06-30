'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';

// Палитра цветов темы (как в Telegram — фиксированный набор)
export const TOPIC_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981',
  '#8b5cf6', '#ec4899', '#14b8a6', '#64748b',
];

// Набор значков темы
const TOPIC_ICONS = [
  '💬', '📌', '📣', '✅', '🔥', '⭐', '💡', '📁',
  '🛠️', '📦', '💰', '📊', '🏗️', '🚧', '📝', '📅',
  '⚠️', '❓', '🎯', '🚀', '🧱', '🔧', '🧰', '🏠',
  '🚜', '🧾', '📷', '🎤', '🔔', '❤️', '👍', '🎉',
  '⚡', '🏆', '🧯', '🦺', '📐', '🗂️', '🔒', '🌐',
];

interface TopicFormModalProps {
  mode: 'create' | 'edit';
  initial?: { name: string; iconEmoji?: string | null; color?: string | null };
  onSubmit: (data: { name: string; iconEmoji?: string; color?: string }) => Promise<void> | void;
  onClose: () => void;
}

export default function TopicFormModal({ mode, initial, onSubmit, onClose }: TopicFormModalProps) {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.iconEmoji || '💬');
  const [color, setColor] = useState(initial?.color || TOPIC_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), iconEmoji: icon, color });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[22rem] max-w-[90vw] mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {mode === 'create' ? t('Создать тему') : t('Изменить тему')}
          </span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview + name */}
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: `${color}22` }}
            >
              <span>{icon}</span>
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder={t('Название темы')}
              maxLength={255}
              className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2 text-sm outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
            />
          </div>

          {/* Colors */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{t('Цвет')}</p>
            <div className="flex gap-2 flex-wrap">
              {TOPIC_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800' : ''}`}
                  style={{ backgroundColor: c, ...(color === c ? { boxShadow: `0 0 0 2px ${c}` } : {}) }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {/* Icons */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{t('Значок')}</p>
            <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
              {TOPIC_ICONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`aspect-square rounded-lg text-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${icon === e ? 'bg-violet-100 dark:bg-violet-500/20' : ''}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {t('Отмена')}
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm rounded-xl bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 transition-colors"
          >
            {mode === 'create' ? t('Создать') : t('Сохранить')}
          </button>
        </div>
      </div>
    </div>
  );
}
