'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ContainerInfo } from '@/types/docker';
import ServiceStatusCard from './ServiceStatusCard';
import ServiceSummaryBar from './ServiceSummaryBar';
import ContainerLogs from './ContainerLogs';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useToastStore } from '@/stores/toastStore';

export default function ServiceGrid() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restartingIds, setRestartingIds] = useState<Set<string>>(new Set());
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set());
  const [startingIds, setStartingIds] = useState<Set<string>>(new Set());
  const [logsContainerId, setLogsContainerId] = useState<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const fetchContainers = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/docker/containers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Не удалось получить список контейнеров');
      const data = await res.json();
      // Ensure data is array and each item has required fields
      const safe = (Array.isArray(data) ? data : []).map((c: Record<string, unknown>) => ({
        id: String(c.id || ''),
        name: String(c.name || ''),
        image: String(c.image || ''),
        status: String(c.status || ''),
        state: String(c.state || 'unknown'),
        ports: String(c.ports || ''),
        createdAt: String(c.createdAt || ''),
        uptime: String(c.uptime || ''),
      })) as ContainerInfo[];
      setContainers(safe);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 10000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  const containerAction = async (
    id: string,
    action: 'restart' | 'stop' | 'start',
    setIds: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    setIds((prev) => new Set(prev).add(id));
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/docker/containers/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Ошибка ${action}`);
      }
      const messages: Record<string, string> = {
        restart: 'Контейнер перезапущен',
        stop: 'Контейнер остановлен',
        start: 'Контейнер запущен',
      };
      addToast('success', messages[action]);
      setTimeout(fetchContainers, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка операции';
      addToast('error', message);
    } finally {
      setIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleRestart = (id: string) => containerAction(id, 'restart', setRestartingIds);
  const handleStop = (id: string) => containerAction(id, 'stop', setStoppingIds);
  const handleStart = (id: string) => containerAction(id, 'start', setStartingIds);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg text-sm">
        {error}
      </div>
    );
  }

  return (
    <div>
      <ServiceSummaryBar containers={containers} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {containers.map((container) => (
          <ServiceStatusCard
            key={container.id}
            container={container}
            onRestart={handleRestart}
            onStop={handleStop}
            onStart={handleStart}
            onViewLogs={setLogsContainerId}
            isRestarting={restartingIds.has(container.id)}
            isStopping={stoppingIds.has(container.id)}
            isStarting={startingIds.has(container.id)}
          />
        ))}
      </div>

      {containers.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
          Контейнеры с префиксом &quot;crm-&quot; не найдены.
        </p>
      )}

      {logsContainerId && (
        <div className="mt-6">
          <ContainerLogs containerId={logsContainerId} onClose={() => setLogsContainerId(null)} />
        </div>
      )}
    </div>
  );
}
