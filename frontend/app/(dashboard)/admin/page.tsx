'use client';

import { useState, useCallback } from 'react';
import ServiceGrid from '@/components/admin/ServiceGrid';
import RoleAccessMatrix from '@/components/admin/RoleAccessMatrix';
import ErrorBoundary from '@/components/admin/ErrorBoundary';
import ErrorDiagnosticsPanel from '@/components/admin/ErrorDiagnosticsPanel';
import type { DiagnosticError } from '@/types/admin';

export default function AdminPage() {
  const [errors, setErrors] = useState<DiagnosticError[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckAll = useCallback(async () => {
    setIsChecking(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/docker/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Не удалось проверить сервисы');
      const data = await res.json();

      const newErrors: DiagnosticError[] = [];
      for (const svc of data.services || []) {
        if (!svc.healthy) {
          newErrors.push({
            category: 'service',
            service: svc.name.replace(/^crm-/, ''),
            message: `Контейнер в состоянии: ${svc.state}`,
            timestamp: new Date().toISOString(),
            suggestion: 'Попробуйте запустить или перезапустить контейнер',
          });
        } else if (svc.httpReachable === false) {
          newErrors.push({
            category: 'network',
            service: svc.name.replace(/^crm-/, ''),
            message: `HTTP порт ${svc.port} не отвечает`,
            timestamp: new Date().toISOString(),
            suggestion: 'Контейнер запущен, но сервис внутри может быть ещё не готов. Подождите или проверьте логи',
          });
        }
      }
      setErrors(newErrors);
    } catch {
      setErrors([{
        category: 'network',
        service: 'health-check',
        message: 'Не удалось выполнить проверку',
        timestamp: new Date().toISOString(),
        suggestion: 'Проверьте подключение к серверу',
      }]);
    } finally {
      setIsChecking(false);
    }
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
          Инфраструктура
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Управление микросервисами, диагностика и роли доступа
        </p>
      </div>

      {/* Error Diagnostics */}
      <ErrorDiagnosticsPanel errors={errors} onCheckAll={handleCheckAll} isChecking={isChecking} />

      {/* Microservices */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Микросервисы
        </h2>
        <ErrorBoundary>
          <ServiceGrid />
        </ErrorBoundary>
      </section>

      {/* Role Access Matrix */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Матрица доступа ролей
        </h2>
        <ErrorBoundary>
          <RoleAccessMatrix />
        </ErrorBoundary>
      </section>
    </div>
  );
}
