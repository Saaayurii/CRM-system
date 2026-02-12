'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { ContainerInfo } from '@/types/docker';
import ServiceStatusCard from './ServiceStatusCard';
import ContainerLogs from './ContainerLogs';
import { CardSkeleton } from '@/components/ui/Skeleton';

export default function ServiceGrid() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restartingIds, setRestartingIds] = useState<Set<string>>(new Set());
  const [logsContainerId, setLogsContainerId] = useState<string | null>(null);

  const fetchContainers = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/docker/containers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch containers');
      const data = await res.json();
      setContainers(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 10000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  const handleRestart = async (id: string) => {
    setRestartingIds((prev) => new Set(prev).add(id));
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/docker/containers/${id}/restart`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setTimeout(fetchContainers, 2000);
    } catch {
      // error handled silently
    } finally {
      setRestartingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {containers.map((container) => (
          <ServiceStatusCard
            key={container.id}
            container={container}
            onRestart={handleRestart}
            onViewLogs={setLogsContainerId}
            isRestarting={restartingIds.has(container.id)}
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
