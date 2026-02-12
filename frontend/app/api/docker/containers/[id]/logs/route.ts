import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
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

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn('docker', ['logs', '--follow', '--tail', '100', id]);

      const encoder = new TextEncoder();

      const sendLine = (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const event = `data: ${JSON.stringify({ timestamp: new Date().toISOString(), message: line })}\n\n`;
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
