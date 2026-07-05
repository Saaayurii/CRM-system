import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Мост cookie → заголовок Authorization.
 *
 * После перехода на httpOnly-cookie браузер больше не кладёт токен в заголовок
 * Authorization (он лежит в httpOnly-cookie `crm_at`, недоступной JS — защита от
 * XSS). Но десятки downstream-контроллеров и JwtStrategy читают именно
 * `Authorization`. Чтобы не переписывать их все, здесь, на самом краю шлюза,
 * если заголовка нет, а cookie есть — подставляем `Authorization: Bearer <...>`.
 *
 * Двойной режим: если Authorization уже пришёл (старый клиент/мобильное
 * приложение) — не трогаем. Так миграция не ломает существующие сессии.
 * cookie-parser не нужен — читаем заголовок Cookie напрямую.
 */
@Injectable()
export class CookieAuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (!req.headers.authorization) {
      const raw = req.headers.cookie;
      if (raw) {
        const match = raw.match(/(?:^|;\s*)crm_at=([^;]+)/);
        if (match) {
          req.headers.authorization = `Bearer ${decodeURIComponent(match[1])}`;
        }
      }
    }
    next();
  }
}
