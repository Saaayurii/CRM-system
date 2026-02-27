import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import net from 'net';
import { verifyAdmin } from '../_lib/verifyAdmin';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type CheckMethod = 'tcp' | 'http';

interface ServiceDiagnostic {
  name: string;
  containerId: string;
  state: string;
  healthy: boolean;
  port: number | null;
  reachable: boolean | null;
  checkMethod: CheckMethod;
  recommendation: string;
  severity: Severity;
  dependsOn: string[];
  affectedBy: string[];
  autoFixAvailable: boolean;
  autoFixAction?: 'restart' | 'start';
}

// Services that use TCP (not HTTP) checks
const TCP_SERVICES = new Set(['crm-postgres', 'crm-redis']);

// Dependency map: service -> what it depends on
const DEPENDENCIES: Record<string, string[]> = {
  'crm-api-gateway': [],
  'crm-auth': ['crm-postgres', 'crm-redis'],
  'crm-users': ['crm-postgres'],
  'crm-projects': ['crm-postgres'],
  'crm-tasks': ['crm-postgres'],
  'crm-materials': ['crm-postgres'],
  'crm-suppliers': ['crm-postgres'],
  'crm-finance': ['crm-postgres'],
  'crm-inspections': ['crm-postgres'],
  'crm-hr': ['crm-postgres'],
  'crm-notifications': ['crm-postgres', 'crm-redis'],
  'crm-chat': ['crm-postgres', 'crm-redis'],
  'crm-calendar': ['crm-postgres'],
  'crm-equipment': ['crm-postgres'],
  'crm-documents': ['crm-postgres'],
  'crm-reports': ['crm-postgres'],
  'crm-dictionary': ['crm-postgres'],
  'crm-audit': ['crm-postgres'],
  'crm-clients': ['crm-postgres'],
  'crm-wiki': ['crm-postgres'],
  'crm-training': ['crm-postgres'],
  'crm-automation': ['crm-postgres', 'crm-redis'],
  'crm-settings': ['crm-postgres'],
  'crm-dashboard': ['crm-postgres'],
  'crm-postgres': [],
  'crm-redis': [],
  'crm-pgadmin': ['crm-postgres'],
  'crm-redis-commander': ['crm-redis'],
};

// Severity by service
const SERVICE_SEVERITY: Record<string, Severity> = {
  'crm-postgres': 'critical',
  'crm-redis': 'critical',
  'crm-api-gateway': 'critical',
  'crm-auth': 'critical',
  'crm-users': 'high',
  'crm-projects': 'high',
  'crm-tasks': 'high',
  'crm-pgadmin': 'low',
  'crm-redis-commander': 'low',
};

function getSeverity(serviceName: string): Severity {
  return SERVICE_SEVERITY[serviceName] || 'medium';
}

function tcpCheck(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);

    socket
      .connect(port, host, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      })
      .on('error', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(false);
      });
  });
}

async function httpCheck(port: number, timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`http://localhost:${port}/health`, {
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);
    return res ? res.ok : false;
  } catch {
    return false;
  }
}

function getRecommendation(
  serviceName: string,
  state: string,
  reachable: boolean | null,
  affectedBy: string[],
): string {
  if (affectedBy.length > 0) {
    const deps = affectedBy.map((d) => d.replace(/^crm-/, '')).join(', ');
    return `Сначала запустите ${deps} — после этого ${serviceName.replace(/^crm-/, '')} заработает автоматически`;
  }

  if (state !== 'running') {
    return `Контейнер не запущен. Запустите: docker start ${serviceName}`;
  }

  if (reachable === false) {
    if (TCP_SERVICES.has(serviceName)) {
      return `Контейнер запущен, но TCP-порт не отвечает. Проверьте логи: docker logs ${serviceName}`;
    }
    return `Контейнер запущен, но HTTP-порт не отвечает. Проверьте логи: docker logs ${serviceName}`;
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

    // First pass: determine which services are down
    const downServices = new Set<string>();
    for (const c of containers) {
      const state = (c.State as string)?.toLowerCase() || 'unknown';
      if (state !== 'running') {
        downServices.add(c.Names as string);
      }
    }

    // Second pass: check reachability and build diagnostics
    for (const c of containers) {
      const name = c.Names as string;
      const state = (c.State as string)?.toLowerCase() || 'unknown';
      const ports = (c.Ports as string) || '';
      const portMatch = ports.match(/0\.0\.0\.0:(\d+)/);
      const port = portMatch ? parseInt(portMatch[1], 10) : null;
      const isTcp = TCP_SERVICES.has(name);
      const checkMethod: CheckMethod = isTcp ? 'tcp' : 'http';
      const deps = DEPENDENCIES[name] || [];

      let reachable: boolean | null = null;

      if (state === 'running' && port) {
        if (isTcp) {
          reachable = await tcpCheck('localhost', port);
        } else {
          reachable = await httpCheck(port);
        }
      }

      // Determine which dependencies are down
      const affectedBy = deps.filter((dep) => downServices.has(dep));

      // Determine autofix
      const isDown = state !== 'running';
      const isUnreachable = state === 'running' && reachable === false;
      const autoFixAvailable = isDown || isUnreachable;
      const autoFixAction: 'start' | 'restart' | undefined = isDown
        ? 'start'
        : isUnreachable
          ? 'restart'
          : undefined;

      services.push({
        name,
        containerId: c.ID as string,
        state,
        healthy: state === 'running' && reachable !== false,
        port,
        reachable,
        checkMethod,
        recommendation: getRecommendation(name, state, reachable, affectedBy),
        severity: getSeverity(name),
        dependsOn: deps,
        affectedBy,
        autoFixAvailable,
        autoFixAction,
      });
    }

    // Also mark services whose TCP port is down — their dependents are affected
    for (const svc of services) {
      if (svc.state === 'running' && svc.reachable === false) {
        downServices.add(svc.name);
      }
    }
    // Re-check affectedBy after TCP checks
    for (const svc of services) {
      const deps = DEPENDENCIES[svc.name] || [];
      svc.affectedBy = deps.filter((dep) => downServices.has(dep));
      svc.recommendation = getRecommendation(svc.name, svc.state, svc.reachable, svc.affectedBy);
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

  const allHealthy = services.every((s) => s.healthy);
  const hasDown = services.some((s) => s.state !== 'running');

  let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';
  let overallRecommendation = 'Все сервисы работают нормально';

  if (hasDown) {
    const downNames = services.filter((s) => s.state !== 'running').map((s) => s.name.replace(/^crm-/, ''));
    overallStatus = 'down';
    overallRecommendation = `Не запущены: ${downNames.join(', ')}. Запустите: docker compose up -d`;
  } else if (!allHealthy) {
    overallStatus = 'degraded';
    overallRecommendation = 'Все контейнеры запущены, но некоторые сервисы не готовы. Проверьте логи.';
  }

  if (!gatewayReachable && allHealthy) {
    overallStatus = 'degraded';
    overallRecommendation = 'API Gateway контейнер запущен, но не отвечает. Проверьте логи: docker logs crm-api-gateway';
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
