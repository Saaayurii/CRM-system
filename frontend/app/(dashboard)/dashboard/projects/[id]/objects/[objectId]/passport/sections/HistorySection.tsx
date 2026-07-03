'use client';

/**
 * Passport section — "История изменений".
 *
 * Renders `ctx.history` (PassportHistoryEntry[]) as a vertical timeline, newest
 * first. Read-only; entries are appended by the backend on every section save.
 */

import React from 'react';
import type { PassportCtx } from '../usePassport';
import type { PassportHistoryEntry } from '../types';
import { Card, EmptyState } from '../primitives';
import { useT } from '@/lib/i18n';

const SECTION_LABEL: Record<string, string> = {
  general: 'Общая информация',
  access: 'Доступ и безопасность',
  engineering: 'Инженерные системы',
  infrastructure: 'Инфраструктура и сети',
  security: 'Безопасность и охрана',
  maintenance: 'Обслуживание и гарантия',
  contacts: 'Контакты',
};

function sectionLabel(code: string): string {
  return SECTION_LABEL[code] || code;
}

function fmt(d: string): string {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleString('ru-RU');
}

export default function HistorySection({ ctx }: { ctx: PassportCtx }) {
  const t = useT();
  const entries: PassportHistoryEntry[] = [...(ctx.history || [])].toReversed();

  return (
    <Card title={t('История изменений')}>
      {entries.length === 0 ? (
        <EmptyState text="История изменений пуста" />
      ) : (
        <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2 space-y-5">
          {entries.map((e) => (
            <li key={e.id} className="ml-5">
              <span className="absolute -left-[6.5px] mt-1.5 w-3 h-3 rounded-full bg-violet-500 ring-4 ring-white dark:ring-gray-800" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{sectionLabel(e.section)}</p>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{fmt(e.changedAt)}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                изменил(а) {e.userName || 'Пользователь'}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
