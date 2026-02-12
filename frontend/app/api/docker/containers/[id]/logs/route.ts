import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const { id } = await params;

  // Validate container ID
  if (!/^[a-zA-Z0-9]+$/.test(id)) {
    return new Response('Invalid container ID', { status: 400 });
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

      // Cleanup when client disconnects
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
