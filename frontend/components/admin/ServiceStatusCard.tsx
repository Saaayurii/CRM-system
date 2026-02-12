'use client';

import Badge from '@/components/ui/Badge';
import type { ContainerInfo } from '@/types/docker';
import ContainerActions from './ContainerActions';

interface ServiceStatusCardProps {
  container: ContainerInfo;
  onRestart: (id: string) => void;
  onStop: (id: string) => void;
  onStart: (id: string) => void;
  onViewLogs: (id: string) => void;
  isRestarting: boolean;
  isStopping: boolean;
  isStarting: boolean;
}

function getStateBadge(state: string) {
  switch (state) {
    case 'running':
      return <Badge variant="success">Работает</Badge>;
    case 'exited':
      return <Badge variant="danger">Остановлен</Badge>;
    case 'restarting':
      return <Badge variant="warning">Перезапуск</Badge>;
    case 'paused':
      return <Badge variant="warning">Пауза</Badge>;
    case 'dead':
      return <Badge variant="danger">Ошибка</Badge>;
    default:
      return <Badge variant="default">{state}</Badge>;
  }
}

export default function ServiceStatusCard({
  container,
  onRestart,
  onStop,
  onStart,
  onViewLogs,
  isRestarting,
  isStopping,
  isStarting,
}: ServiceStatusCardProps) {
  const displayName = container.name.replace(/^crm-/, '').replace(/-/g, ' ');

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate capitalize">
            {displayName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{container.image}</p>
        </div>
        {getStateBadge(container.state)}
      </div>

      {container.ports && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
          Порты: {container.ports}
        </p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate">
        {container.uptime}
      </p>

      <div className="mt-auto">
        <ContainerActions
          containerId={container.id}
          containerState={container.state}
          onRestart={onRestart}
          onStop={onStop}
          onStart={onStart}
          onViewLogs={onViewLogs}
          isRestarting={isRestarting}
          isStopping={isStopping}
          isStarting={isStarting}
        />
      </div>
    </div>
  );
}
