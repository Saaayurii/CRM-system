import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { StorageService } from '../../common/services/storage.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'inspections');

@SkipThrottle()
@ApiTags('Inspections')
@ApiBearerAuth()
@Controller('api/v1/inspections')
export class InspectionsUploadController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload photos/files for inspections & defects' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 15, {
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
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    }),
  )
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return Promise.all(
      files.map(async (file) => ({
        fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        fileSize: file.size,
        mimeType: file.mimetype,
        fileUrl: await this.storage.finalizeUpload(file, 'inspections'),
      })),
    );
  }
}
