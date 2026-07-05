import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { StorageService } from '../../common/services/storage.service';
import { Roles, MANAGEMENT_ROLES } from '../../common/decorators/roles.decorator';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'reports');
const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL || '').replace(/\/$/, '');

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'text/csv': '.csv',
  'application/csv': '.csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/pdf': '.pdf',
};

@Roles(...MANAGEMENT_ROLES)
@SkipThrottle()
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('api/v1/report-templates')
export class ReportsUploadController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file for a report template' })
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
          const ext = ALLOWED_MIME_TO_EXT[file.mimetype] ?? '.bin';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TO_EXT[file.mimetype]) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Недопустимый тип файла. Разрешены: CSV, XLSX, XLS, PDF'), false);
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileUrl: await this.storage.finalizeUpload(file, 'reports'),
    };
  }
}
