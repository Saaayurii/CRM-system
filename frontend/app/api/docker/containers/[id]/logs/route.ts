import { NextRequest } from 'next/server';
import { spawn, execSync } from 'child_process';
import { verifyAdmin } from '../../../_lib/verifyAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return new Response('Доступ запрещён', { status: 403 });
  }

  const { id } = await params;

  if (!/^[a-zA-Z0-9]+$/.test(id)) {
    return new Response('Некорректный ID контейнера', { status: 400 });
  }

  // Check if container exists and is running
  try {
    const inspectOutput = execSync(
      `docker inspect --format '{{.State.Status}}' ${id}`,
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();

    if (inspectOutput !== 'running') {
      return new Response(
        JSON.stringify({ error: `Контейнер не запущен (статус: ${inspectOutput})` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Контейнер не найден' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn('docker', ['logs', '--follow', '--tail', '100', '--timestamps', id]);

      const encoder = new TextEncoder();

      const sendLine = (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          // Docker --timestamps format: 2024-01-15T12:00:00.000000000Z message
          const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s*(.*)/);
          const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
          const message = timestampMatch ? timestampMatch[2] : line;

          const event = `data: ${JSON.stringify({ timestamp, message })}\n\n`;
          controller.enqueue(encoder.encode(event));
        }
      };

      proc.stdout.on('data', sendLine);
      proc.stderr.on('data', sendLine);

      proc.on('close', () => {
        controller.close();
      });

      proc.on('error', () => {
        controller.close();
      });

      request.signal.addEventListener('abort', () => {
        proc.kill();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
