import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { readFile, unlink } from 'fs/promises';

/**
 * Отгрузка загруженных файлов в S3-совместимое хранилище.
 *
 * Подключено к облачному хранилищу REG.RU (`https://s3.regru.cloud`), но код
 * полностью S3-совместим и работает с любым провайдером (Yandex, MinIO и т. п.)
 * через переменные окружения.
 *
 * Контроллеры аплоада пишут файл во временную папку `uploads/<folder>/` (multer
 * diskStorage), затем зовут `finalizeUpload(file, folder)`:
 *  - `STORAGE_PROVIDER` != `s3` (по умолчанию `local`) — файл остаётся на диске,
 *    возвращается `${APP_PUBLIC_URL}/uploads/<folder>/<filename>`.
 *  - `STORAGE_PROVIDER=s3` — файл заливается в бакет (ACL public-read), локальная
 *    копия удаляется, возвращается публичный S3-URL. При ошибке S3 — НЕ молчим:
 *    пишем error в лог и делаем graceful fallback на локальный URL.
 *
 * Переменные окружения (см. .env.example / backend/env.docker):
 *   STORAGE_PROVIDER=s3
 *   AWS_S3_BUCKET_NAME=crm-315
 *   AWS_S3_ACCESS_KEY_ID=<access key id>
 *   AWS_S3_SECRET_ACCESS_KEY=<secret>
 *   AWS_S3_ENDPOINT=https://s3.regru.cloud
 *   AWS_S3_REGION=ru-1                 (REG.RU регион игнорирует, но SDK требует значение)
 *   AWS_S3_FORCE_PATH_STYLE=true       (REG.RU работает по path-style)
 *   AWS_S3_PUBLIC_URL=                 (опционально: CDN/кастомный домен перед бакетом)
 *
 * Бакет должен разрешать публичное чтение объектов (bucket policy public GetObject
 * или per-object ACL public-read — последний код проставляет на каждый объект сам).
 */
export interface StorageLogEntry {
  ts: string;
  level: 'log' | 'warn' | 'error';
  message: string;
}

export interface StorageStatus {
  provider: string;
  enabled: boolean;
  endpoint: string;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
  publicBase: string;
  bucketReachable: boolean | null;
  checkError: string | null;
  checkedAt: string | null;
  logs: StorageLogEntry[];
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;

  private readonly logs: StorageLogEntry[] = [];
  private static readonly MAX_LOGS = 80;

  private readonly provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  private readonly bucket = process.env.AWS_S3_BUCKET_NAME || '';
  private readonly region = process.env.AWS_S3_REGION || 'ru-1';
  private readonly endpoint = (process.env.AWS_S3_ENDPOINT || 'https://s3.regru.cloud').replace(/\/$/, '');
  private readonly forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE !== 'false';
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
   * Старт-ап диагностика: если выбран S3, сразу проверяем доступ к бакету и
   * громко логируем результат — чтобы проблемы с доступом были видны при запуске,
   * а не всплывали молча при первой загрузке файла.
   */
  async onModuleInit(): Promise<void> {
    if (this.provider !== 's3') {
      this.record('log', 'Storage provider: local (файлы хранятся на диске /uploads)');
      return;
    }

    const missing: string[] = [];
    if (!this.bucket) missing.push('AWS_S3_BUCKET_NAME');
    if (!process.env.AWS_S3_ACCESS_KEY_ID) missing.push('AWS_S3_ACCESS_KEY_ID');
    if (!process.env.AWS_S3_SECRET_ACCESS_KEY) missing.push('AWS_S3_SECRET_ACCESS_KEY');
    if (missing.length) {
      this.record('error', 
        `STORAGE_PROVIDER=s3, но не заданы переменные: ${missing.join(', ')}. ` +
          'Загрузки будут падать в локальный диск (fallback).',
      );
      return;
    }

    this.record('log', 
      `Storage provider: s3 — endpoint=${this.endpoint} bucket=${this.bucket} ` +
        `region=${this.region} pathStyle=${this.forcePathStyle}`,
    );
    try {
      await this.getClient().send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.record('log', `S3 доступ подтверждён: бакет "${this.bucket}" доступен ✅`);
    } catch (err) {
      this.record('error', 
        `❌ Нет доступа к S3-бакету "${this.bucket}" (${this.endpoint}): ` +
          `${(err as Error).name}: ${(err as Error).message}. ` +
          'Проверьте ключи/имя бакета. До исправления файлы будут падать в локальный диск (fallback).',
      );
    }
  }

  /** Публичный URL объекта по его ключу. */
  publicUrl(key: string): string {
    if (this.s3PublicUrl) return `${this.s3PublicUrl}/${key}`;
    // path-style URL — валиден для REG.RU: https://s3.regru.cloud/<bucket>/<key>
    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  /**
   * Возвращает публичный URL для файла, сохранённого multer'ом на диск.
   * При включённом S3 переливает файл в бакет; локальную копию удаляет, если
   * `deleteLocal !== false`.
   */
  async finalizeUpload(
    file: Express.Multer.File,
    folder: string,
    deleteLocal = true,
  ): Promise<string> {
    const localUrl = `${this.appPublicUrl}/uploads/${folder}/${file.filename}`;
    if (!this.isS3Enabled) return localUrl;

    const key = `${folder}/${file.filename}`;
    try {
      const body = file.buffer ?? (await readFile(file.path));
      await this.putObject(key, body, file.mimetype || 'application/octet-stream');
      if (deleteLocal && file.path) {
        unlink(file.path).catch(() => {});
      }
      this.record('log', `S3 upload ok: ${key} (${file.size ?? body.length} b)`);
      return this.publicUrl(key);
    } catch (err) {
      this.record('error', 
        `❌ S3 upload failed для "${key}": ${(err as Error).name}: ${(err as Error).message} ` +
          '— файл оставлен на локальном диске (fallback).',
      );
      return localUrl;
    }
  }

  /**
   * Залить произвольный локальный файл по явному ключу (используется для
   * перекодированных вариантов видео в чате). Возвращает публичный S3-URL либо
   * null при ошибке/выключенном S3. Локальный файл удаляется при `deleteLocal`.
   */
  async uploadLocalFile(
    localPath: string,
    key: string,
    contentType: string,
    deleteLocal = true,
  ): Promise<string | null> {
    if (!this.isS3Enabled) return null;
    try {
      const body = await readFile(localPath);
      await this.putObject(key, body, contentType);
      if (deleteLocal) {
        unlink(localPath).catch(() => {});
      }
      this.record('log', `S3 upload ok: ${key} (${body.length} b)`);
      return this.publicUrl(key);
    } catch (err) {
      this.record('error', 
        `❌ S3 upload failed для "${key}": ${(err as Error).name}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /** Проверить наличие объекта в бакете. */
  async objectExists(key: string): Promise<boolean> {
    if (!this.isS3Enabled) return false;
    try {
      await this.getClient().send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Удалить объект по ключу. */
  async deleteObject(key: string): Promise<void> {
    if (!this.isS3Enabled) return;
    try {
      await this.getClient().send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.record('log', `S3 delete ok: ${key}`);
    } catch (err) {
      this.record('error', 
        `❌ S3 delete failed для "${key}": ${(err as Error).name}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Извлечь S3-ключ из публичного URL (или вернуть строку как есть, если это уже
   * ключ). Понимает и path-style endpoint, и кастомный AWS_S3_PUBLIC_URL.
   */
  keyFromUrl(urlOrKey: string): string | null {
    if (!urlOrKey) return null;
    const prefixes = [
      this.s3PublicUrl ? `${this.s3PublicUrl}/` : '',
      `${this.endpoint}/${this.bucket}/`,
    ].filter(Boolean);
    for (const p of prefixes) {
      if (urlOrKey.startsWith(p)) return urlOrKey.slice(p.length);
    }
    if (!urlOrKey.includes('://')) return urlOrKey.replace(/^\/+/, '');
    return null;
  }

  /**
   * Статус хранилища для админ-панели (super_admin). Делает живой HeadBucket,
   * отдаёт конфиг (БЕЗ секретов) и последние записи лога загрузок/ошибок.
   */
  async getStatus(): Promise<StorageStatus> {
    let bucketReachable: boolean | null = null;
    let checkError: string | null = null;
    let checkedAt: string | null = null;

    if (this.isS3Enabled) {
      checkedAt = new Date().toISOString();
      try {
        await this.getClient().send(new HeadBucketCommand({ Bucket: this.bucket }));
        bucketReachable = true;
      } catch (err) {
        bucketReachable = false;
        checkError = `${(err as Error).name}: ${(err as Error).message}`;
        this.record('error', `❌ HeadBucket "${this.bucket}" не прошёл: ${checkError}`);
      }
    }

    return {
      provider: this.provider,
      enabled: this.isS3Enabled,
      endpoint: this.endpoint,
      bucket: this.bucket,
      region: this.region,
      forcePathStyle: this.forcePathStyle,
      publicBase: this.s3PublicUrl || `${this.endpoint}/${this.bucket}`,
      bucketReachable,
      checkError,
      checkedAt,
      logs: [...this.logs].reverse(), // свежие сверху
    };
  }

  /** Пишет в системный лог И в кольцевой буфер для админ-панели. */
  private record(level: StorageLogEntry['level'], message: string): void {
    if (level === 'error') this.logger.error(message);
    else if (level === 'warn') this.logger.warn(message);
    else this.logger.log(message);

    this.logs.push({ ts: new Date().toISOString(), level, message });
    if (this.logs.length > StorageService.MAX_LOGS) {
      this.logs.splice(0, this.logs.length - StorageService.MAX_LOGS);
    }
  }

  private async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Объекты должны открываться публично (аватары/логотипы/вложения чата).
        // Дублирует bucket policy на случай, если политику снимут.
        ACL: 'public-read',
      }),
    );
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
