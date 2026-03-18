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
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'attendance');
const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL || '').replace(/\/$/, '');

@SkipThrottle()
@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('api/v1/attendance')
export class AttendanceUploadController {
  @Post('upload')
  @ApiOperation({ summary: 'Upload a photo for attendance check-in' })
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
          const ext = extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileUrl: `${APP_PUBLIC_URL}/uploads/attendance/${file.filename}`,
    };
  }
}
