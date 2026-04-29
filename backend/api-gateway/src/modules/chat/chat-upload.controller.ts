import {
  Controller,
  Post,
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

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'chat');
const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL || '').replace(/\/$/, '');

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

    return files.map((file) => ({
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileUrl: `${APP_PUBLIC_URL}/uploads/chat/${file.filename}`,
    }));
  }

  @Delete('upload/:filename')
  @ApiOperation({ summary: 'Delete an uploaded chat file' })
  deleteUpload(@Param('filename') filename: string) {
    // Prevent path traversal
    const safe = basename(filename);
    const filePath = join(UPLOAD_DIR, safe);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    try {
      unlinkSync(filePath);
    } catch {
      // Ignore if already gone
    }
    return { deleted: safe };
  }
}
