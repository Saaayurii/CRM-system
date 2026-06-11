'use client';
import { useT } from '@/lib/i18n';

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteConfirmModal({ open, onClose, onConfirm, loading }: DeleteConfirmModalProps) {
  const t = useT();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
          {t('Подтверждение удаления')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('Вы уверены? Это действие нельзя отменить.')}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
          >
            {t('Отмена')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-sm bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
          >
            {loading ? t('Удаление...') : t('Удалить')}
          </button>
        </div>
      </div>
    </div>
  );
}
