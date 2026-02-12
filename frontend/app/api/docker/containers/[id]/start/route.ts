import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { verifyAdmin } from '../../../_lib/verifyAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { id } = await params;

  if (!/^[a-zA-Z0-9]+$/.test(id)) {
    return NextResponse.json({ error: 'Некорректный ID контейнера' }, { status: 400 });
  }

  try {
    execSync(`docker start ${id}`, { encoding: 'utf-8', timeout: 30000 });
    return NextResponse.json({ success: true, message: `Контейнер ${id} запущен` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось запустить контейнер';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
