import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { verifyAdmin } from '../_lib/verifyAdmin';

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
      .map((line) => {
        const c = JSON.parse(line);
        return {
          id: c.ID,
          name: c.Names,
          image: c.Image,
          status: c.Status,
          state: c.State?.toLowerCase() || 'unknown',
          ports: c.Ports || '',
          createdAt: c.CreatedAt || '',
          uptime: c.Status || '',
        };
      })
      .filter((c) => c.name.startsWith('crm-'));

    return NextResponse.json(containers);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось получить список контейнеров';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
