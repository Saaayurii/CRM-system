import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile, unlink } from 'fs/promises';

/**
 * Опциональная отгрузка загруженных файлов в S3 (Яндекс Object Storage).
 *
 * Контроллеры аплоада работают как раньше: multer (diskStorage) пишет файл в
 * `uploads/<folder>/`. Дальше вызывается `finalizeUpload(file, folder)`:
 *
 *  - `STORAGE_PROVIDER` НЕ равен `s3` (по умолчанию `local`) — поведение
 *    прежнее без изменений: файл остаётся на диске, возвращается
 *    `${APP_PUBLIC_URL}/uploads/<folder>/<filename>`.
 *  - `STORAGE_PROVIDER=s3` — файл дополнительно загружается в бакет,
 *    локальная копия удаляется, возвращается публичный S3-URL.
 *    При любой ошибке S3 — graceful fallback на локальный URL.
 *
 * Переменные окружения для Яндекс Object Storage (уже есть в .env.example):
 *   STORAGE_PROVIDER=s3
 *   AWS_S3_BUCKET_NAME=<бакет>
 *   AWS_S3_ACCESS_KEY_ID=<id статического ключа сервисного аккаунта>
 *   AWS_S3_SECRET_ACCESS_KEY=<секрет>
 *   AWS_S3_ENDPOINT=https://storage.yandexcloud.net   (значение по умолчанию)
 *   AWS_S3_REGION=ru-central1                          (значение по умолчанию)
 *   AWS_S3_FORCE_PATH_STYLE=false                      (true для MinIO)
 *   AWS_S3_PUBLIC_URL=                                 (опционально: CDN/кастомный домен)
 *
 * Бакет должен разрешать публичное чтение объектов (или укажите
 * AWS_S3_PUBLIC_URL на CDN перед бакетом).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;

  private readonly provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  private readonly bucket = process.env.AWS_S3_BUCKET_NAME || '';
  private readonly region = process.env.AWS_S3_REGION || 'ru-central1';
  private readonly endpoint = (process.env.AWS_S3_ENDPOINT || 'https://storage.yandexcloud.net').replace(/\/$/, '');
  private readonly forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === 'true';
  private readonly s3PublicUrl = (process.env.AWS_S3_PUBLIC_URL || '').replace(/\/$/, '');
  private readonly appPublicUrl = (process.env.APP_PUBLIC_URL || '').replace(/\/$/, '');

  get isS3Enabled(): boolean {
    return (
      this.provider === 's3' &&
      !!this.bucket &&
      !!process.env.AWS_S3_ACCESS_KEY_ID &&
      !!process.env.AWS_S3_SECRET_ACCESS_KEY
    );
  }

  /**
   * Возвращает публичный URL для файла, уже сохранённого multer'ом на диск.
   * При включённом S3 переливает файл в бакет и удаляет локальную копию.
   */
  async finalizeUpload(file: Express.Multer.File, folder: string): Promise<string> {
    const localUrl = `${this.appPublicUrl}/uploads/${folder}/${file.filename}`;

    if (!this.isS3Enabled) return localUrl;

    try {
      const body = file.buffer ?? (await readFile(file.path));
      const key = `${folder}/${file.filename}`;
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: file.mimetype || 'application/octet-stream',
        }),
      );
      if (file.path) {
        unlink(file.path).catch(() => {});
      }
      if (this.s3PublicUrl) return `${this.s3PublicUrl}/${key}`;
      // path-style URL — валиден для Яндекса: https://storage.yandexcloud.net/<bucket>/<key>
      return `${this.endpoint}/${this.bucket}/${key}`;
    } catch (err) {
      this.logger.error(
        `S3 upload failed (${(err as Error).message}) — keeping local file`,
      );
      return localUrl;
    }
  }

  private getClient(): S3Client {
    if (!this.s3) {
      this.s3 = new S3Client({
        region: this.region,
        endpoint: this.endpoint,
        forcePathStyle: this.forcePathStyle,
        credentials: {
          accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
        },
      });
    }
    return this.s3;
  }
}
