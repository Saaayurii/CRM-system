import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return user?.role?.code === 'super_admin';
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const message = error instanceof Error ? error.message : 'Failed to list containers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
