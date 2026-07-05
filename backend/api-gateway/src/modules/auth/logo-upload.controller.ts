import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { StorageService } from '../../common/services/storage.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'logos');
const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL || '').replace(/\/$/, '');

// SVG исключён намеренно: SVG может содержать <script> → stored XSS при отдаче с того же origin
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@ApiTags('Auth')
@Controller('api/v1/auth')
export class LogoUploadController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload-logo')
  @Public()
  @ApiOperation({ summary: 'Upload company logo during registration (public, images only, 2MB max)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR)) {
            mkdirSync(UPLOAD_DIR, { recursive: true });
          }
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = ALLOWED_MIME_TO_EXT[file.mimetype] ?? '.jpg';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TO_EXT[file.mimetype]) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Разрешены только изображения (JPEG, PNG, WebP, GIF)'), false);
        }
      },
    }),
  )
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не передан');
    const fileUrl = await this.storage.finalizeUpload(file, 'logos');
    return {
      url: fileUrl,
      fileUrl,
    };
  }
}
