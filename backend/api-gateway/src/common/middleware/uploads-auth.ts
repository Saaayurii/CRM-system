import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';

/**
 * Авторизация статики `/uploads/*` (аудит #2: файлы, в т.ч. HR/финансовые
 * PDF-документы, отдавались вообще без проверки — любой с URL мог их скачать).
 *
 * Токен берём из тех же источников, что и остальной шлюз:
 *  - `Authorization: Bearer <...>` (старые клиенты / мобилка);
 *  - httpOnly-cookie `crm_at` — браузер сам шлёт её на `<img src="/uploads/...">`
 *    и открытие PDF (same-origin), поэтому картинки/документы у авторизованных
 *    пользователей продолжают грузиться без изменений на фронте;
 *  - `?token=` (fallback, как в SSE).
 *
 * Верификация зеркалит `buildJwtKeyOptions`: HS256 по общему секрету, а при
 * заданном `JWT_PUBLIC_KEY` — ещё и RS256 по публичному ключу (alg из заголовка).
 *
 * Публичный allowlist — только логотипы компаний (`/uploads/logos/*`): они
 * показываются на странице логина ДО аутентификации, поэтому остаются открытыми
 * (лого не является чувствительными данными). Всё остальное (avatars, documents,
 * chat, inspections, attendance) требует валидный токен.
 */
const PUBLIC_PREFIXES = ['/logos/'];

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);

  const raw = req.headers.cookie;
  if (raw) {
    const m = raw.match(/(?:^|;\s*)crm_at=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }

  const q = req.query?.token;
  if (typeof q === 'string' && q) return q;

  return null;
}

export function createUploadsAuthMiddleware(config: ConfigService) {
  const jwt = new JwtService();
  const secret = config.get<string>('jwt.accessSecret') || 'default-access-secret';
  const publicKey = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');

  return (req: Request, res: Response, next: NextFunction): void => {
    // req.path внутри mount `/uploads` уже относительный (напр. `/logos/x.png`).
    if (PUBLIC_PREFIXES.some((p) => req.path.startsWith(p))) {
      next();
      return;
    }

    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }

    try {
      if (publicKey) {
        const header = JSON.parse(
          Buffer.from(token.split('.')[0], 'base64url').toString('utf8'),
        );
        if (header?.alg === 'RS256') {
          jwt.verify(token, { publicKey, algorithms: ['RS256'] });
          next();
          return;
        }
      }
      jwt.verify(token, { secret, algorithms: ['HS256'] });
      next();
    } catch {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
    }
  };
}
