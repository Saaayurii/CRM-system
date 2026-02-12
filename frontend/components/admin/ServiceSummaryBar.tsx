'use client';

import type { ContainerInfo } from '@/types/docker';

interface ServiceSummaryBarProps {
  containers: ContainerInfo[];
}

const STATE_LABELS: Record<string, string> = {
  running: 'Работает',
  exited: 'Остановлен',
  restarting: 'Перезапуск',
  paused: 'Пауза',
  dead: 'Ошибка',
};

function getTimeSince(status: string): string {
  // Docker status like "Exited (0) 5 minutes ago" or "Up 3 hours"
  const match = status.match(/(\d+)\s*(second|minute|hour|day|week|month)/i);
  if (!match) return '';
  const num = match[1];
  const unit = match[2].toLowerCase();
  const unitMap: Record<string, string> = {
    second: 'сек.',
    minute: 'мин.',
    hour: 'ч.',
    day: 'дн.',
    week: 'нед.',
    month: 'мес.',
  };
  return `${num} ${unitMap[unit] || unit} назад`;
}

export default function ServiceSummaryBar({ containers }: ServiceSummaryBarProps) {
  const total = containers.length;
  const running = containers.filter((c) => c.state === 'running').length;
  const stopped = containers.filter((c) => c.state !== 'running');

  const ratio = total > 0 ? running / total : 0;
  let colorClass = 'bg-green-500';
  let textColorClass = 'text-green-600 dark:text-green-400';
  if (ratio < 0.5) {
    colorClass = 'bg-red-500';
    textColorClass = 'text-red-600 dark:text-red-400';
  } else if (ratio < 1) {
    colorClass = 'bg-yellow-500';
    textColorClass = 'text-yellow-600 dark:text-yellow-400';
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-3 h-3 rounded-full ${colorClass}`} />
        <h3 className={`text-lg font-semibold ${textColorClass}`}>
          Запущено {running} из {total} микросервисов
        </h3>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${total > 0 ? (running / total) * 100 : 0}%` }}
        />
      </div>

      {stopped.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Недоступные сервисы:
          </p>
          {stopped.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm2.78 4.97a.75.75 0 0 0-1.06 0L8 6.69 6.28 4.97a.75.75 0 0 0-1.06 1.06L6.94 7.75 5.22 9.47a.75.75 0 1 0 1.06 1.06L8 8.81l1.72 1.72a.75.75 0 1 0 1.06-1.06L9.06 7.75l1.72-1.72a.75.75 0 0 0 0-1.06Z" />
              </svg>
              <span className="font-medium">{c.name.replace(/^crm-/, '')}</span>
              <span className="text-gray-500 dark:text-gray-500">
                ({STATE_LABELS[c.state] || c.state}
                {c.uptime ? `, ${getTimeSince(c.uptime)}` : ''})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
