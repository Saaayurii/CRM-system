'use client';

import { useState } from 'react';

/**
 * Плашка-предупреждение у поля ввода почты/логина: вход и регистрация через
 * иностранные сервисы (Gmail, Apple ID и т.п.) на российских сайтах больше не
 * допускаются — в связи с законопроектом №1069392-8 (поправки в КоАП).
 * Источник: https://sozd.duma.gov.ru/bill/1069392-8
 *
 * Появляется при наведении/фокусе на поле (`open`) либо автоматически, когда в
 * поле введён адрес иностранного почтового провайдера.
 *
 * Раскладка: на десктопе (lg+) — справа от поля; на телефоне/планшете —
 * компактная плашка, зафиксированная вверху экрана (не перекрывает форму).
 * Фон полностью непрозрачный, поверх формы.
 */

const FOREIGN_EMAIL_RE =
  /@(gmail|googlemail|google|apple|icloud|me|mac|hotmail|outlook|live|msn|yahoo|ymail|rocketmail|proton|protonmail|gmx|aol)\./i;

export function isForeignEmail(value: string): boolean {
  return FOREIGN_EMAIL_RE.test(value.trim());
}

export default function ForeignEmailNotice({
  value,
  open,
}: {
  value: string;
  open: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const visible = (open || isForeignEmail(value)) && !dismissed;
  if (!visible) return null;

  return (
    <div
      className="fixed top-2 inset-x-2 z-[60]
                 lg:absolute lg:top-0 lg:inset-x-auto lg:left-full lg:ml-4 lg:w-80"
    >
      {/* стрелочка к полю — только на десктопе */}
      <div className="hidden lg:block absolute top-5 -left-1.5 w-3 h-3 rotate-45 bg-white dark:bg-gray-900 border-l border-b border-amber-300 dark:border-amber-500/40" />

      <div className="relative rounded-xl border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-gray-900 shadow-2xl px-3 py-2 lg:px-4 lg:py-3 text-left animate-fadeInUpSoft">
        {/* крестик закрытия */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Закрыть"
          className="absolute top-1.5 right-1.5 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-2 lg:gap-2.5 pr-5">
          <svg
            className="w-4 h-4 lg:w-5 lg:h-5 shrink-0 mt-0.5 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="text-[11px] leading-snug lg:text-xs lg:leading-relaxed text-gray-600 dark:text-gray-300 space-y-1 lg:space-y-1.5">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              Вход через Gmail и Apple ID больше недоступен
            </p>
            <p>
              С 9 июня 2026 года, согласно законопроекту{' '}
              <a
                href="https://sozd.duma.gov.ru/bill/1069392-8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-500 hover:text-violet-600 underline underline-offset-2"
              >
                №&nbsp;1069392-8
              </a>{' '}
              (поправки в КоАП), регистрация и авторизация на российских сайтах через
              иностранные сервисы — Gmail, Apple ID, Outlook и т.п. — не допускаются.
              Ответственность за нарушение несёт владелец сайта.
            </p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              Используйте российскую почту (Mail.ru, Яндекс), номер телефона +7 или «Госуслуги».
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
