import { NextRequest, NextResponse } from 'next/server';
import { mkdirSync, renameSync, unlinkSync, readFileSync } from 'fs';
import { appendFile } from 'fs/promises';
import { join, extname } from 'path';
import sharp from 'sharp';

const API_GATEWAY = (process.env.API_GATEWAY_INTERNAL_URL ?? process.env.API_GATEWAY_URL ?? 'http://localhost:3000').replace(/\/$/, '');

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

    const tempDir   = join('/tmp', 'chat-uploads');
    mkdirSync(tempDir, { recursive: true });

    const ext       = extname(fileName);
    const tempPath  = join(tempDir, `${uploadId}.tmp`);

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
      finalPath = join(tempDir, finalName);
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
      // Non-image: just rename temp file in the same dir
      finalName = `${uploadId}${ext}`;
      finalPath = join(tempDir, finalName);
      renameSync(tempPath, finalPath);
      finalMime = mimeType;
      finalSize = fileSize;
    }

    // Forward assembled file to api-gateway so it lands in the chat_uploads volume
    const authHeader = request.headers.get('authorization') ?? '';
    const displayName = isImage ? fileName.replace(/\.[^.]+$/, '.webp') : fileName;

    try {
      const fileBuffer = readFileSync(finalPath);
      const gwForm = new FormData();
      gwForm.append('files', new Blob([fileBuffer], { type: finalMime }), displayName);

      const gwRes = await fetch(`${API_GATEWAY}/api/v1/chat-channels/upload`, {
        method: 'POST',
        headers: authHeader ? { authorization: authHeader } : {},
        body: gwForm,
      });

      // Clean up local file regardless of gateway result
      try { unlinkSync(finalPath); } catch {}

      if (!gwRes.ok) {
        const errText = await gwRes.text().catch(() => '');
        console.error('Gateway upload failed:', gwRes.status, errText);
        return NextResponse.json({ error: 'Gateway upload failed' }, { status: 502 });
      }

      const [gwData] = await gwRes.json() as { fileName: string; fileSize: number; mimeType: string; fileUrl: string }[];

      // Normalize to path-only (gateway may include full domain in APP_PUBLIC_URL)
      let fileUrl = gwData.fileUrl ?? `/uploads/chat/${finalName}`;
      try { fileUrl = new URL(fileUrl).pathname; } catch { /* already a path */ }

      return NextResponse.json({
        fileName: displayName,
        fileSize: gwData.fileSize,
        mimeType: gwData.mimeType,
        fileUrl,
        ...(isImage && { originalSize: fileSize }),
      });
    } catch (fwdError) {
      try { unlinkSync(finalPath); } catch {}
      console.error('Forward to gateway error:', fwdError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

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
