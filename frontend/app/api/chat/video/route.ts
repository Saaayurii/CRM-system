import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync, existsSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const ALLOWED_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.ogg', '.m4v']);

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const file = request.nextUrl.searchParams.get('file') ?? '';

  // Security: no path traversal, no slashes
  if (!file || file.includes('..') || file.includes('/') || file.includes('\\')) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const filePath = join(process.cwd(), 'public', 'uploads', 'chat', file);
  if (!existsSync(filePath)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const { size } = statSync(filePath);
  const mimeType = MIME[ext] ?? 'video/mp4';
  const rangeHeader = request.headers.get('range');

  if (rangeHeader) {
    const [, rangeValue] = rangeHeader.split('=');
    const [startStr, endStr] = rangeValue.split('-');
    const start = parseInt(startStr, 10);
    // Default chunk: 2 MB, capped at file end
    const end = endStr ? parseInt(endStr, 10) : Math.min(start + 10 * 1024 * 1024 - 1, size - 1); // 10 MB chunks

    if (isNaN(start) || start >= size || end >= size || start > end) {
      return new NextResponse('Range Not Satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }

    const chunkSize = end - start + 1;
    const stream = createReadableStream(filePath, start, end);

    return new NextResponse(stream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
      },
    });
  }

  // No Range header — stream the whole file
  const stream = createReadableStream(filePath, 0, size - 1);

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes',
      'Content-Type': mimeType,
      'Cache-Control': 'no-store',
    },
  });
}

function createReadableStream(path: string, start: number, end: number): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      const fs = createReadStream(path, { start, end });
      fs.on('data', (chunk) => controller.enqueue(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      fs.on('end', () => controller.close());
      fs.on('error', (err) => controller.error(err));
    },
  });
}
