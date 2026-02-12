import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { verifyAdmin } from '../_lib/verifyAdmin';

interface ServiceHealth {
  name: string;
  containerId: string;
  state: string;
  healthy: boolean;
  port: number | null;
  httpReachable: boolean | null;
  error?: string;
}

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

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

    const results: ServiceHealth[] = [];

    for (const c of containers) {
      const state = (c.State as string)?.toLowerCase() || 'unknown';
      const ports = (c.Ports as string) || '';
      // Extract first host port mapping like 0.0.0.0:3001->3000/tcp
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

      results.push({
        name: c.Names as string,
        containerId: c.ID as string,
        state,
        healthy: state === 'running',
        port,
        httpReachable,
      });
    }

    const running = results.filter((r) => r.healthy).length;
    const total = results.length;

    return NextResponse.json({
      running,
      total,
      services: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось проверить состояние сервисов';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
