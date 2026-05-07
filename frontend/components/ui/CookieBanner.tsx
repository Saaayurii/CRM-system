'use client';

import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
          Мы используем файлы cookie и обрабатываем персональные данные в соответствии с{' '}
          <a href="/privacy" className="text-violet-500 hover:text-violet-600 underline underline-offset-2">
            Политикой конфиденциальности
          </a>{' '}
          и требованиями Федерального закона №&nbsp;152-ФЗ «О персональных данных». Продолжая использование сайта, вы соглашаетесь с условиями обработки данных.
        </div>
        <button
          onClick={accept}
          className="shrink-0 px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Принять
        </button>
      </div>
    </div>
  );
}
