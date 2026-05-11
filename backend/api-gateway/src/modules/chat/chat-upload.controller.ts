import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'chat');
const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL || '').replace(/\/$/, '');

function transcodeVariants(inputPath: string, nameWithoutExt: string): void {
  const variants = [
    { label: '480p', scale: '480', crf: '28' },
    { label: '720p', scale: '720', crf: '26' },
  ];

  for (const v of variants) {
    const outPath = join(UPLOAD_DIR, `${nameWithoutExt}_${v.label}.mp4`);
    spawn(
      'ffmpeg',
      [
        '-i', inputPath,
        '-vf', `scale=-2:${v.scale}`,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', v.crf,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outPath,
      ],
      { stdio: 'ignore' },
    );
  }
}

@SkipThrottle()
@ApiTags('Chat')
@ApiBearerAuth()
@Controller('api/v1/chat-channels')
export class ChatUploadController {
  @Post('upload')
  @ApiOperation({ summary: 'Upload files for chat messages' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR)) {
            mkdirSync(UPLOAD_DIR, { recursive: true });
          }
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 1 * 1024 * 1024 * 1024 }, // 1 GB
    }),
  )
  uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return files.map((file) => {
      const isVideo = file.mimetype.startsWith('video/');
      if (isVideo) {
        const nameWithoutExt = file.filename.replace(/\.[^.]+$/, '');
        transcodeVariants(file.path, nameWithoutExt);
      }

      return {
        fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        fileSize: file.size,
        mimeType: file.mimetype,
        fileUrl: `${APP_PUBLIC_URL}/uploads/chat/${file.filename}`,
      };
    });
  }

  @Get('variants/:filename')
  @ApiOperation({ summary: 'Get available quality variants for a video' })
  getVariants(@Param('filename') filename: string) {
    const safe = basename(filename);
    const nameWithoutExt = safe.replace(/\.[^.]+$/, '');

    const qualities: { label: string; url: string }[] = [];

    for (const label of ['480p', '720p']) {
      const variantFile = `${nameWithoutExt}_${label}.mp4`;
      if (existsSync(join(UPLOAD_DIR, variantFile))) {
        qualities.push({
          label,
          url: `${APP_PUBLIC_URL}/uploads/chat/${variantFile}`,
        });
      }
    }

    qualities.push({
      label: 'Исходное',
      url: `${APP_PUBLIC_URL}/uploads/chat/${safe}`,
    });

    return { qualities };
  }

  @Delete('upload/:filename')
  @ApiOperation({ summary: 'Delete an uploaded chat file' })
  deleteUpload(@Param('filename') filename: string) {
    const safe = basename(filename);
    const filePath = join(UPLOAD_DIR, safe);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    try {
      unlinkSync(filePath);
      // Also clean up variants if they exist
      const nameWithoutExt = safe.replace(/\.[^.]+$/, '');
      for (const label of ['480p', '720p']) {
        const variantPath = join(UPLOAD_DIR, `${nameWithoutExt}_${label}.mp4`);
        if (existsSync(variantPath)) unlinkSync(variantPath);
      }
    } catch {
      // Ignore if already gone
    }
    return { deleted: safe };
  }
}
