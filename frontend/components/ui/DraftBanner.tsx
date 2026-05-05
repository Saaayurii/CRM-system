'use client';

interface DraftBannerProps {
  onRestore: () => void;
  onDiscard: () => void;
}

export default function DraftBanner({ onRestore, onDiscard }: DraftBannerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/50 text-sm">
      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <span className="flex-1 text-amber-700 dark:text-amber-300">
        Найден незавершённый черновик. Продолжить заполнение?
      </span>
      <button
        type="button"
        onClick={onRestore}
        className="px-3 py-1 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors shrink-0"
      >
        Восстановить
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors shrink-0"
      >
        Отменить
      </button>
    </div>
  );
}
