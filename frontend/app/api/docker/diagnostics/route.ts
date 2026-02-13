import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { verifyAdmin } from '../_lib/verifyAdmin';

interface ServiceDiagnostic {
  name: string;
  containerId: string;
  state: string;
  healthy: boolean;
  port: number | null;
  httpReachable: boolean | null;
  recommendation: string;
}

const SERVICE_RECOMMENDATIONS: Record<string, string> = {
  'api-gateway': 'API Gateway — основная точка входа. Без него фронтенд не может связаться с бэкендом. Проверьте: docker logs crm-api-gateway',
  'auth': 'Сервис авторизации. Без него невозможен вход в систему. Проверьте: docker logs crm-auth',
  'users': 'Сервис пользователей. Управление аккаунтами будет недоступно. Проверьте: docker logs crm-users',
  'projects': 'Сервис проектов. Работа с проектами будет недоступна. Проверьте: docker logs crm-projects',
  'tasks': 'Сервис задач. Управление задачами будет недоступно. Проверьте: docker logs crm-tasks',
  'postgres': 'База данных PostgreSQL. Критически важный сервис. Проверьте: docker logs crm-postgres',
  'redis': 'Redis — кэш и очереди. Часть функций может работать медленнее. Проверьте: docker logs crm-redis',
};

function getRecommendation(serviceName: string, state: string, httpReachable: boolean | null): string {
  const baseName = serviceName.replace(/^crm-/, '');

  if (state !== 'running') {
    const specific = SERVICE_RECOMMENDATIONS[baseName];
    return specific
      ? `${specific}. Запустите: docker start ${serviceName}`
      : `Контейнер ${serviceName} не запущен. Запустите: docker start ${serviceName}`;
  }

  if (httpReachable === false) {
    return `Контейнер запущен, но HTTP-порт не отвечает. Сервис может ещё запускаться — подождите 10-15 секунд. Если проблема сохраняется: docker restart ${serviceName}`;
  }

  return 'Работает нормально';
}

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  // Check if API Gateway is reachable
  let gatewayReachable = false;
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const baseUrl = apiUrl.replace(/\/api\/v1$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${baseUrl}/health`, { signal: controller.signal }).catch(() => null);
    clearTimeout(timeout);
    gatewayReachable = res ? res.ok : false;
  } catch {
    gatewayReachable = false;
  }

  // Get container info via Docker
  const services: ServiceDiagnostic[] = [];

  try {
    const output = execSync('docker ps -a --format "{{json .}}"', {
      encoding: 'utf-8',
      timeout: 10000,
    });

    const containers = output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((c) => (c.Names as string).startsWith('crm-'));

    for (const c of containers) {
      const state = (c.State as string)?.toLowerCase() || 'unknown';
      const ports = (c.Ports as string) || '';
      const portMatch = ports.match(/0\.0\.0\.0:(\d+)/);
      const port = portMatch ? parseInt(portMatch[1], 10) : null;

      let httpReachable: boolean | null = null;

      if (state === 'running' && port) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(`http://localhost:${port}/health`, {
            signal: controller.signal,
          }).catch(() => null);
          clearTimeout(timeout);
          httpReachable = res ? res.ok : false;
        } catch {
          httpReachable = false;
        }
      }

      services.push({
        name: c.Names as string,
        containerId: c.ID as string,
        state,
        healthy: state === 'running',
        port,
        httpReachable,
        recommendation: getRecommendation(c.Names as string, state, httpReachable),
      });
    }
  } catch (error) {
    return NextResponse.json({
      gatewayReachable,
      dockerAvailable: false,
      services: [],
      recommendation: 'Docker не доступен. Убедитесь что Docker Desktop запущен.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const allRunning = services.every((s) => s.healthy);
  const allHttpOk = services.filter((s) => s.port).every((s) => s.httpReachable !== false);

  let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';
  let overallRecommendation = 'Все сервисы работают нормально';

  if (!allRunning) {
    const downServices = services.filter((s) => !s.healthy).map((s) => s.name.replace(/^crm-/, ''));
    overallStatus = 'down';
    overallRecommendation = `Не запущены: ${downServices.join(', ')}. Запустите: docker compose up -d`;
  } else if (!allHttpOk) {
    overallStatus = 'degraded';
    overallRecommendation = 'Все контейнеры запущены, но некоторые сервисы ещё не готовы. Подождите или проверьте логи.';
  }

  if (!gatewayReachable && allRunning) {
    overallStatus = 'degraded';
    overallRecommendation = 'API Gateway контейнер запущен, но не отвечает на HTTP запросы. Проверьте логи: docker logs crm-api-gateway';
  }

  return NextResponse.json({
    gatewayReachable,
    dockerAvailable: true,
    overallStatus,
    overallRecommendation,
    services,
    running: services.filter((s) => s.healthy).length,
    total: services.length,
  });
}
