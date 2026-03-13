import { NextRequest, NextResponse } from 'next/server';
import { createWriteStream, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

// Stream raw binary request body directly to disk (no memory buffering)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!request.body) {
      return NextResponse.json({ error: 'No body' }, { status: 400 });
    }

    const rawName = request.headers.get('x-file-name') || 'file';
    const fileName = decodeURIComponent(rawName);
    const fileSize = parseInt(request.headers.get('x-file-size') || '0', 10);
    const mimeType =
      request.headers.get('x-file-type') ||
      guessMimeType(extname(fileName)) ||
      'application/octet-stream';

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat');
    mkdirSync(uploadDir, { recursive: true });

    const ext = extname(fileName);
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = join(uploadDir, uniqueName);

    // Pipe Web ReadableStream → Node.js WriteStream without loading into memory
    await streamBodyToFile(request.body, filePath);

    return NextResponse.json({
      fileName,
      fileSize,
      mimeType,
      fileUrl: `/uploads/chat/${uniqueName}`,
    });
  } catch (error) {
    console.error('Chat upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

async function streamBodyToFile(
  body: ReadableStream<Uint8Array>,
  filePath: string,
): Promise<void> {
  const fileStream = createWriteStream(filePath);
  const reader = body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await new Promise<void>((resolve, reject) => {
        if (value) {
          if (!fileStream.write(value)) {
            fileStream.once('drain', resolve);
          } else {
            resolve();
          }
        } else {
          resolve();
        }
      });
    }
    await new Promise<void>((resolve, reject) => {
      fileStream.end((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    fileStream.destroy();
    throw err;
  } finally {
    reader.releaseLock();
  }
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
