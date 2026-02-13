'use client';

import { useState, useCallback, useEffect } from 'react';
import ServiceGrid from '@/components/admin/ServiceGrid';
import RoleAccessMatrix from '@/components/admin/RoleAccessMatrix';
import ErrorBoundary from '@/components/admin/ErrorBoundary';
import ErrorDiagnosticsPanel from '@/components/admin/ErrorDiagnosticsPanel';
import type { DiagnosticError } from '@/types/admin';

interface DiagnosticsResponse {
  gatewayReachable: boolean;
  overallStatus?: 'ok' | 'degraded' | 'down';
  overallRecommendation?: string;
  services?: Array<{
    name: string;
    state: string;
    healthy: boolean;
    port: number | null;
    httpReachable: boolean | null;
    recommendation: string;
  }>;
}

export default function AdminPage() {
  const [errors, setErrors] = useState<DiagnosticError[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [gatewayDown, setGatewayDown] = useState(false);
  const [overallRecommendation, setOverallRecommendation] = useState('');

  const handleCheckAll = useCallback(async () => {
    setIsChecking(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/docker/diagnostics', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Не удалось проверить сервисы');
      const data: DiagnosticsResponse = await res.json();

      setGatewayDown(!data.gatewayReachable);
      setOverallRecommendation(data.overallRecommendation || '');

      const newErrors: DiagnosticError[] = [];
      for (const svc of data.services || []) {
        if (!svc.healthy) {
          newErrors.push({
            category: 'service',
            service: svc.name.replace(/^crm-/, ''),
            message: `Контейнер в состоянии: ${svc.state}`,
            timestamp: new Date().toISOString(),
            suggestion: svc.recommendation,
          });
        } else if (svc.httpReachable === false) {
          newErrors.push({
            category: 'network',
            service: svc.name.replace(/^crm-/, ''),
            message: `HTTP порт ${svc.port} не отвечает`,
            timestamp: new Date().toISOString(),
            suggestion: svc.recommendation,
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

  // Auto-check on mount and every 30 seconds
  useEffect(() => {
    handleCheckAll();
    const interval = setInterval(handleCheckAll, 30000);
    return () => clearInterval(interval);
  }, [handleCheckAll]);

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

      {/* Backend Down Banner */}
      {gatewayDown && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
                Backend не отвечает
              </h3>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                API Gateway недоступен. Функции CRM будут работать с ограничениями.
              </p>
              {overallRecommendation && (
                <p className="text-sm text-red-600/70 dark:text-red-400/70 mt-2 font-mono">
                  {overallRecommendation}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
