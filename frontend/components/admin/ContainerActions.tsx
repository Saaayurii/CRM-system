'use client';

import { useState } from 'react';

interface ContainerActionsProps {
  containerId: string;
  onRestart: (id: string) => void;
  onViewLogs: (id: string) => void;
  isRestarting: boolean;
}

export default function ContainerActions({ containerId, onRestart, onViewLogs, isRestarting }: ContainerActionsProps) {
  const [confirmRestart, setConfirmRestart] = useState(false);

  const handleRestart = () => {
    if (!confirmRestart) {
      setConfirmRestart(true);
      setTimeout(() => setConfirmRestart(false), 3000);
      return;
    }
    setConfirmRestart(false);
    onRestart(containerId);
  };

  return (
    <div className="flex gap-2">
      <button
        className={`btn-xs ${
          confirmRestart
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300'
        }`}
        onClick={handleRestart}
        disabled={isRestarting}
      >
        {isRestarting ? (
          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : confirmRestart ? (
          'Подтвердить?'
        ) : (
          'Restart'
        )}
      </button>
      <button
        className="btn-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
        onClick={() => onViewLogs(containerId)}
      >
        Logs
      </button>
    </div>
  );
}
