import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { verifyAdmin } from '../_lib/verifyAdmin';

interface FixStep {
  service: string;
  action: string;
  success: boolean;
  message: string;
}

// Start order: infrastructure first, then core, then the rest
const FIX_ORDER: string[][] = [
  ['crm-postgres'],
  ['crm-redis'],
  ['crm-auth', 'crm-api-gateway'],
  ['crm-users', 'crm-projects', 'crm-tasks', 'crm-hr', 'crm-finance'],
  [
    'crm-materials', 'crm-suppliers', 'crm-inspections', 'crm-notifications',
    'crm-chat', 'crm-calendar', 'crm-equipment', 'crm-documents',
    'crm-reports', 'crm-dictionary', 'crm-audit', 'crm-clients',
    'crm-wiki', 'crm-training', 'crm-automation', 'crm-settings', 'crm-dashboard',
  ],
  ['crm-pgadmin', 'crm-redis-commander'],
];

function getContainerState(name: string): string | null {
  try {
    const output = execSync(
      `docker inspect --format '{{.State.Status}}' ${name}`,
      { encoding: 'utf-8', timeout: 5000 },
    ).trim();
    return output;
  } catch {
    return null;
  }
}

function startOrRestart(name: string): FixStep {
  const state = getContainerState(name);

  if (state === null) {
    return { service: name, action: 'skip', success: true, message: 'Контейнер не найден — пропускаем' };
  }

  if (state === 'running') {
    return { service: name, action: 'skip', success: true, message: 'Уже запущен' };
  }

  try {
    execSync(`docker start ${name}`, { encoding: 'utf-8', timeout: 15000 });
    return { service: name, action: 'start', success: true, message: 'Запущен' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { service: name, action: 'start', success: false, message: `Ошибка запуска: ${msg}` };
  }
}

function restartService(name: string): FixStep {
  try {
    execSync(`docker restart ${name}`, { encoding: 'utf-8', timeout: 15000 });
    return { service: name, action: 'restart', success: true, message: 'Перезапущен' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { service: name, action: 'restart', success: false, message: `Ошибка перезапуска: ${msg}` };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  let body: { action: string; serviceName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const steps: FixStep[] = [];

  if (body.action === 'fix-service' && body.serviceName) {
    const name = body.serviceName;
    // Validate service name to prevent command injection
    if (!/^crm-[a-z-]+$/.test(name)) {
      return NextResponse.json({ error: 'Неверное имя сервиса' }, { status: 400 });
    }

    const state = getContainerState(name);
    if (state === 'running') {
      steps.push(restartService(name));
    } else {
      steps.push(startOrRestart(name));
    }
  } else if (body.action === 'fix-all') {
    // Get list of existing containers
    let existingContainers: Set<string>;
    try {
      const output = execSync('docker ps -a --format "{{.Names}}"', {
        encoding: 'utf-8',
        timeout: 10000,
      });
      existingContainers = new Set(output.trim().split('\n').filter(Boolean));
    } catch {
      return NextResponse.json({
        steps: [{ service: 'docker', action: 'check', success: false, message: 'Docker не доступен' }],
      });
    }

    for (const group of FIX_ORDER) {
      const groupSteps: FixStep[] = [];
      for (const name of group) {
        if (existingContainers.has(name)) {
          groupSteps.push(startOrRestart(name));
        }
      }
      steps.push(...groupSteps);

      // Wait between groups for services to initialize
      const anyStarted = groupSteps.some((s) => s.action === 'start' && s.success);
      if (anyStarted) {
        await sleep(3000);
      }
    }
  } else {
    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  }

  return NextResponse.json({ steps });
}
