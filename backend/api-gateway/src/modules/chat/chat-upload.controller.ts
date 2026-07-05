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
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { StorageService } from '../../common/services/storage.service';
import { AnyRole } from '../../common/decorators/roles.decorator';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'chat');
const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL || '').replace(/\/$/, '');
const VIDEO_VARIANTS = [
  { label: '480p', scale: '480', crf: '28' },
  { label: '720p', scale: '720', crf: '26' },
];

@AnyRole()
@SkipThrottle()
@ApiTags('Chat')
@ApiBearerAuth()
@Controller('api/v1/chat-channels')
export class ChatUploadController {
  private readonly logger = new Logger(ChatUploadController.name);

  constructor(private readonly storage: StorageService) {}

  /**
   * Перекодирует видео в варианты качества (ffmpeg, локально), затем — при
   * включённом S3 — заливает каждый готовый вариант в бакет и удаляет локальную
   * копию. Когда все варианты обработаны и S3 включён, удаляет локальный оригинал.
   * Работает асинхронно (как раньше): варианты появляются по мере готовности.
   */
  private transcodeVariants(inputPath: string, nameWithoutExt: string): void {
    let remaining = VIDEO_VARIANTS.length;
    const onVariantDone = () => {
      remaining -= 1;
      // оригинал нужен ffmpeg'у для всех вариантов; чистим его последним
      if (remaining === 0 && this.storage.isS3Enabled) {
        try {
          if (existsSync(inputPath)) unlinkSync(inputPath);
        } catch {
          /* ignore */
        }
      }
    };

    for (const v of VIDEO_VARIANTS) {
      const variantName = `${nameWithoutExt}_${v.label}.mp4`;
      const outPath = join(UPLOAD_DIR, variantName);
      const proc = spawn(
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

      proc.on('error', (err) => {
        this.logger.error(`ffmpeg не запустился для ${variantName}: ${err.message}`);
        onVariantDone();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`ffmpeg завершился с кодом ${code} для ${variantName}`);
          onVariantDone();
          return;
        }
        if (this.storage.isS3Enabled) {
          this.storage
            .uploadLocalFile(outPath, `chat/${variantName}`, 'video/mp4')
            .catch(() => null)
            .finally(onVariantDone);
        } else {
          onVariantDone();
        }
      });
    }
  }

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
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return Promise.all(
      files.map(async (file) => {
        const isVideo = file.mimetype.startsWith('video/');
        const nameWithoutExt = file.filename.replace(/\.[^.]+$/, '');

        // Оригинал заливаем в S3. Для видео оставляем локальную копию —
        // она нужна ffmpeg'у; transcodeVariants удалит её после перекодировки.
        const fileUrl = await this.storage.finalizeUpload(file, 'chat', !isVideo);

        if (isVideo) {
          this.transcodeVariants(file.path, nameWithoutExt);
        }

        return {
          fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
          fileSize: file.size,
          mimeType: file.mimetype,
          fileUrl,
        };
      }),
    );
  }

  @Get('variants/:filename')
  @ApiOperation({ summary: 'Get available quality variants for a video' })
  async getVariants(@Param('filename') filename: string) {
    const safe = basename(filename);
    const nameWithoutExt = safe.replace(/\.[^.]+$/, '');
    const qualities: { label: string; url: string }[] = [];

    for (const { label } of VIDEO_VARIANTS) {
      const variantFile = `${nameWithoutExt}_${label}.mp4`;
      if (this.storage.isS3Enabled) {
        if (await this.storage.objectExists(`chat/${variantFile}`)) {
          qualities.push({ label, url: this.storage.publicUrl(`chat/${variantFile}`) });
        }
      } else if (existsSync(join(UPLOAD_DIR, variantFile))) {
        qualities.push({ label, url: `${APP_PUBLIC_URL}/uploads/chat/${variantFile}` });
      }
    }

    qualities.push({
      label: 'Исходное',
      url: this.storage.isS3Enabled
        ? this.storage.publicUrl(`chat/${safe}`)
        : `${APP_PUBLIC_URL}/uploads/chat/${safe}`,
    });

    return { qualities };
  }

  @Delete('upload/:filename')
  @ApiOperation({ summary: 'Delete an uploaded chat file' })
  async deleteUpload(@Param('filename') filename: string) {
    const safe = basename(filename);
    const nameWithoutExt = safe.replace(/\.[^.]+$/, '');

    if (this.storage.isS3Enabled) {
      await this.storage.deleteObject(`chat/${safe}`);
      for (const { label } of VIDEO_VARIANTS) {
        await this.storage.deleteObject(`chat/${nameWithoutExt}_${label}.mp4`);
      }
    }

    // подчищаем и локальные копии (актуально для local-режима и видео-оригиналов)
    const filePath = join(UPLOAD_DIR, safe);
    let removedLocal = false;
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
        removedLocal = true;
        for (const { label } of VIDEO_VARIANTS) {
          const variantPath = join(UPLOAD_DIR, `${nameWithoutExt}_${label}.mp4`);
          if (existsSync(variantPath)) unlinkSync(variantPath);
        }
      } catch {
        // Ignore if already gone
      }
    }

    if (!this.storage.isS3Enabled && !removedLocal) {
      throw new NotFoundException('File not found');
    }

    return { deleted: safe };
  }
}
