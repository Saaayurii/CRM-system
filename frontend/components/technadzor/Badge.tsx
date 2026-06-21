'use client';

const COLORS: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

export default function Badge({ label, color = 'gray' }: { label: string; color?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${COLORS[color] ?? COLORS.gray}`}>
      {label}
    </span>
  );
}

// ─── Общие справочники статусов/критичности дефектов (numeric, как в БД) ───
export const DEFECT_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Открыт', color: 'red' },
  1: { label: 'Назначен', color: 'blue' },
  2: { label: 'В работе', color: 'yellow' },
  3: { label: 'Устранён', color: 'green' },
  4: { label: 'Проверен', color: 'purple' },
  5: { label: 'Закрыт', color: 'gray' },
};

export const DEFECT_SEVERITY: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкая', color: 'green' },
  2: { label: 'Средняя', color: 'yellow' },
  3: { label: 'Высокая', color: 'orange' },
  4: { label: 'Критическая', color: 'red' },
};

export const INSPECTION_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Запланирована', color: 'gray' },
  1: { label: 'В процессе', color: 'yellow' },
  2: { label: 'Завершена', color: 'green' },
  3: { label: 'Не пройдена', color: 'red' },
};

// Статусы проверки пункта чек-листа
export const CHECK_STATUS: Record<string, { label: string; color: string }> = {
  pass: { label: 'Соответствует', color: 'green' },
  remark: { label: 'Замечание', color: 'yellow' },
  fail: { label: 'Не соответствует', color: 'red' },
  none: { label: 'Не проверено', color: 'gray' },
};
