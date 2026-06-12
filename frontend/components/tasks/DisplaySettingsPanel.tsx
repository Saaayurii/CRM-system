'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';

/**
 * Перетаскиваемая панель «Настройки отображения» для таблиц задач.
 * Генерализована из TableSettingsModal главной страницы задач: секции и
 * ключи настроек передаются снаружи, изменения применяются сразу.
 */

export interface DisplaySettingsSection {
  title: string;
  items: { key: string; label: string; hint?: string }[];
}

export default function DisplaySettingsPanel<S extends { [K in keyof S]: boolean }>({
  sections,
  settings,
  defaults,
  onChange,
  onClose,
}: {
  sections: DisplaySettingsSection[];
  settings: S;
  defaults: S;
  onChange: (s: S) => void;
  onClose: () => void;
}) {
  const t = useT();
  const values = settings as Record<string, boolean>;
  const toggle = (key: string) => onChange({ ...settings, [key]: !values[key] });
  const isDefault = JSON.stringify(settings) === JSON.stringify(defaults);

  // Перетаскиваемая панель без затемнения — таблица видна, изменения сразу заметны
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 480) : 100,
    y: 88,
  }));
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragOffset.current) return;
      e.preventDefault();
      setPos({
        x: Math.min(Math.max(8, e.clientX - dragOffset.current.dx), window.innerWidth - 80),
        y: Math.min(Math.max(8, e.clientY - dragOffset.current.dy), window.innerHeight - 60),
      });
    };
    const up = () => { dragOffset.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed z-[180] w-[26rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
      style={{ left: pos.x, top: pos.y, maxHeight: 'calc(100vh - 24px)' }}
    >
      <div
        onPointerDown={(e) => { dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; }}
        className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('Настройки отображения')}</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('Изменения применяются сразу • потяните за шапку, чтобы передвинуть')}</p>
        </div>
        <button
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{t(section.title)}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const checked = values[item.key];
                return (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.key)}
                      className="sr-only"
                    />
                    <span className={`w-[18px] h-[18px] rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-violet-500 border-violet-500' : 'border-gray-300 dark:border-gray-600'}`}>
                      {checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-gray-700 dark:text-gray-300">{t(item.label)}</span>
                      {item.hint && <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-px">{t(item.hint)}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-between">
        <button
          onClick={() => onChange({ ...defaults })}
          disabled={isDefault}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
        >
          Сбросить по умолчанию
        </button>
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
        >
          Готово
        </button>
      </div>
    </div>
  );
}
