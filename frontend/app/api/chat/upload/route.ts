import { NextRequest, NextResponse } from 'next/server';
import { mkdirSync, renameSync } from 'fs';
import { appendFile } from 'fs/promises';
import { join, extname } from 'path';

export const runtime = 'nodejs';

// Each chunk ≤ 5 MB → stays within Next.js body limits.
// Client sends chunks sequentially; server appends to a temp file.
// On the final chunk the temp file is moved to its permanent location.

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!request.body) {
      return NextResponse.json({ error: 'No body' }, { status: 400 });
    }

    // ── Headers sent by the client ──────────────────────────
    const uploadId   = request.headers.get('x-upload-id')    ?? '';
    const chunkIndex = parseInt(request.headers.get('x-chunk-index') ?? '0', 10);
    const chunkTotal = parseInt(request.headers.get('x-chunk-total') ?? '1', 10);
    const rawName    = request.headers.get('x-file-name')    ?? 'file';
    const fileName   = decodeURIComponent(rawName);
    const fileSize   = parseInt(request.headers.get('x-file-size') ?? '0', 10);
    const mimeType   =
      request.headers.get('x-file-type') ||
      guessMimeType(extname(fileName))    ||
      'application/octet-stream';

    if (!uploadId) {
      return NextResponse.json({ error: 'Missing x-upload-id' }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat');
    const tempDir   = join(uploadDir, 'temp');
    mkdirSync(tempDir, { recursive: true });

    const ext       = extname(fileName);
    const tempPath  = join(tempDir,   `${uploadId}.tmp`);
    const finalName = `${uploadId}${ext}`;
    const finalPath = join(uploadDir, finalName);

    // Read chunk data from the raw body
    const chunkBuffer = await readBodyToBuffer(request.body);

    // Append this chunk to the temp file
    await appendFile(tempPath, chunkBuffer);

    // Last chunk → move temp file to its permanent location
    if (chunkIndex === chunkTotal - 1) {
      renameSync(tempPath, finalPath);

      return NextResponse.json({
        fileName,
        fileSize,
        mimeType,
        fileUrl: `/uploads/chat/${finalName}`,
      });
    }

    // Intermediate chunk → acknowledge
    return NextResponse.json({ received: chunkIndex + 1, total: chunkTotal });
  } catch (error) {
    console.error('Chat upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────

async function readBodyToBuffer(body: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.rar': 'application/vnd.rar',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}
