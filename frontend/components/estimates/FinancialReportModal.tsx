'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

type Format = 'expense-statement' | 'balance-detail';

export default function FinancialReportModal({
  projectId,
  onClose,
}: {
  projectId: number;
  onClose: () => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [format, setFormat] = useState<Format>('balance-detail');
  const [articles, setArticles] = useState<string[]>([]);
  const [article, setArticle] = useState<string>('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<string[]>(`/financial-reports/project/${projectId}/articles`);
        setArticles(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) setArticle(data[0]);
      } catch {
        // ignore — список статей пустой когда нет платежей
      }
    })();
  }, [projectId]);

  const handleDownload = async () => {
    try {
      setSubmitting(true);
      const res = await api.get(`/financial-reports/project/${projectId}/export`, {
        params: {
          format,
          article: format === 'expense-statement' ? article : undefined,
          periodFrom: periodFrom || undefined,
          periodTo: periodTo || undefined,
        },
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      const slug = format === 'expense-statement' ? 'expense' : 'balance';
      a.download = `${slug}-project-${projectId}-${stamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      addToast('error', 'Не удалось сформировать отчёт');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('Финансовый отчёт')}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat('balance-detail')}
              className={`p-3 text-left rounded-lg border-2 transition-colors ${
                format === 'balance-detail'
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
              }`}
            >
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('Детализация баланса')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Все приходы и расходы проекта с разбивкой по статьям
              </p>
            </button>
            <button
              type="button"
              onClick={() => setFormat('expense-statement')}
              className={`p-3 text-left rounded-lg border-2 transition-colors ${
                format === 'expense-statement'
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
              }`}
            >
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('Ведомость по статье')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Платежи по конкретной статье расходов
              </p>
            </button>
          </div>

          {format === 'expense-statement' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('Статья расходов')}</label>
              {articles.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  В проекте ещё нет расходных платежей со статьёй. Заведите платёж на вкладке «Финансы».
                </p>
              ) : (
                <select value={article} onChange={(e) => setArticle(e.target.value)} className={inputCls}>
                  {articles.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('Период с')}</label>
              <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('Период по')}</label>
              <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Отмена
          </button>
          <button
            onClick={handleDownload}
            disabled={submitting || (format === 'expense-statement' && articles.length === 0)}
            className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
          >
            {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Скачать PDF
          </button>
        </div>
      </div>
    </div>
  );
}
