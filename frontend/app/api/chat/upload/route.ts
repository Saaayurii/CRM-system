import { NextRequest, NextResponse } from 'next/server';
import { mkdirSync, renameSync, unlinkSync } from 'fs';
import { appendFile } from 'fs/promises';
import { join, extname } from 'path';
import sharp from 'sharp';

export const runtime = 'nodejs';

// Each chunk ≤ 5 MB → stays within Next.js body limits.
// Client sends chunks sequentially; server appends to a temp file.
// On the final chunk the temp file is moved to its permanent location.
// Images are compressed with sharp (max 2048px, WebP quality 85).

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/bmp',
]);

// Max dimension and quality for compression
const MAX_DIMENSION = 2048;
const WEBP_QUALITY  = 85;

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
    const compress   = request.headers.get('x-compress') !== 'false';

    if (!uploadId) {
      return NextResponse.json({ error: 'Missing x-upload-id' }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat');
    const tempDir   = join(uploadDir, 'temp');
    mkdirSync(tempDir, { recursive: true });

    const ext       = extname(fileName);
    const tempPath  = join(tempDir,   `${uploadId}.tmp`);

    // Read chunk data from the raw body
    const chunkBuffer = await readBodyToBuffer(request.body);

    // Append this chunk to the temp file
    await appendFile(tempPath, chunkBuffer);

    // Intermediate chunk → acknowledge
    if (chunkIndex < chunkTotal - 1) {
      return NextResponse.json({ received: chunkIndex + 1, total: chunkTotal });
    }

    // ── Last chunk: finalize ──────────────────────────────
    const isImage = IMAGE_MIME_TYPES.has(mimeType.toLowerCase()) && compress;

    let finalName: string;
    let finalPath: string;
    let finalMime: string;
    let finalSize: number;

    if (isImage) {
      // Compress to WebP
      finalName = `${uploadId}.webp`;
      finalPath = join(uploadDir, finalName);
      finalMime = 'image/webp';

      await sharp(tempPath)
        .rotate()                          // auto-orient from EXIF
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toFile(finalPath);

      // Remove temp file
      try { unlinkSync(tempPath); } catch {}

      const { size } = await import('fs').then(fs =>
        new Promise<{ size: number }>((resolve, reject) => {
          fs.stat(finalPath, (err, stat) => err ? reject(err) : resolve(stat));
        })
      );
      finalSize = size;
    } else {
      // Non-image: just move temp file as-is
      finalName = `${uploadId}${ext}`;
      finalPath = join(uploadDir, finalName);
      renameSync(tempPath, finalPath);
      finalMime = mimeType;
      finalSize = fileSize;
    }

    return NextResponse.json({
      fileName: isImage ? fileName.replace(/\.[^.]+$/, '.webp') : fileName,
      fileSize: finalSize,
      mimeType: finalMime,
      fileUrl:  `/uploads/chat/${finalName}`,
      ...(isImage && { originalSize: fileSize }),
    });

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
    '.mp4':  'video/mp4',
    '.mov':  'video/quicktime',
    '.avi':  'video/x-msvideo',
    '.mkv':  'video/x-matroska',
    '.webm': 'video/webm',
    '.mp3':  'audio/mpeg',
    '.wav':  'audio/wav',
    '.ogg':  'audio/ogg',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.bmp':  'image/bmp',
    '.tiff': 'image/tiff',
    '.pdf':  'application/pdf',
    '.zip':  'application/zip',
    '.rar':  'application/vnd.rar',
    '.doc':  'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls':  'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}
