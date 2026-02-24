import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat');
    await mkdir(uploadDir, { recursive: true });

    const results = await Promise.all(
      files.map(async (file) => {
        const ext = extname(file.name);
        const uniqueName = `${randomUUID()}${ext}`;
        const bytes = await file.arrayBuffer();
        await writeFile(join(uploadDir, uniqueName), Buffer.from(bytes));

        return {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileUrl: `/uploads/chat/${uniqueName}`,
        };
      }),
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Chat upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
