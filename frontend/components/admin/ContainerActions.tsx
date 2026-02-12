'use client';

import { useState } from 'react';

interface ContainerActionsProps {
  containerId: string;
  containerState: string;
  onRestart: (id: string) => void;
  onStop?: (id: string) => void;
  onStart?: (id: string) => void;
  onViewLogs: (id: string) => void;
  isRestarting: boolean;
  isStopping?: boolean;
  isStarting?: boolean;
}

const Spinner = () => (
  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const btnSecondary = 'btn-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300';

export default function ContainerActions({
  containerId,
  containerState,
  onRestart,
  onStop,
  onStart,
  onViewLogs,
  isRestarting,
  isStopping = false,
  isStarting = false,
}: ContainerActionsProps) {
  const [confirmAction, setConfirmAction] = useState<'restart' | 'stop' | null>(null);

  const isRunning = containerState === 'running';

  const handleConfirmable = (action: 'restart' | 'stop') => {
    if (confirmAction !== action) {
      setConfirmAction(action);
      setTimeout(() => setConfirmAction(null), 3000);
      return;
    }
    setConfirmAction(null);
    if (action === 'restart') onRestart(containerId);
    if (action === 'stop' && onStop) onStop(containerId);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {isRunning ? (
        <>
          {onStop && (
            <button
              className={`btn-xs ${
                confirmAction === 'stop'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : btnSecondary
              }`}
              onClick={() => handleConfirmable('stop')}
              disabled={isStopping}
            >
              {isStopping ? <Spinner /> : confirmAction === 'stop' ? 'Подтвердить?' : 'Остановка'}
            </button>
          )}
          <button
            className={`btn-xs ${
              confirmAction === 'restart'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : btnSecondary
            }`}
            onClick={() => handleConfirmable('restart')}
            disabled={isRestarting}
          >
            {isRestarting ? <Spinner /> : confirmAction === 'restart' ? 'Подтвердить?' : 'Перезапуск'}
          </button>
        </>
      ) : (
        onStart && (
          <button
            className="btn-xs bg-green-500 hover:bg-green-600 text-white"
            onClick={() => onStart(containerId)}
            disabled={isStarting}
          >
            {isStarting ? <Spinner /> : 'Запуск'}
          </button>
        )
      )}
      <button className={btnSecondary} onClick={() => onViewLogs(containerId)}>
        Логи
      </button>
    </div>
  );
}
