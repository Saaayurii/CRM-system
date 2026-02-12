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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // Validate container ID — only alphanumeric chars
  if (!/^[a-zA-Z0-9]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid container ID' }, { status: 400 });
  }

  try {
    execSync(`docker restart ${id}`, { encoding: 'utf-8', timeout: 30000 });
    return NextResponse.json({ success: true, message: `Container ${id} restarted` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restart container';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
