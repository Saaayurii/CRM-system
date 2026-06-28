import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { userContext } from './user-context';

/**
 * Декодирует (БЕЗ верификации) payload JWT, чтобы достать sub (userId) и
 * положить в AsyncLocalStorage на время запроса. Верификацию делает глобальный
 * JwtAuthGuard ДО хендлера и любой записи в БД — значит невалидный токен до
 * write никогда не дойдёт, и decode-only здесь безопасен (атрибуция, не доступ).
 */
function decodeUserId(req: Request): number | undefined {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return undefined;
  const parts = auth.slice(7).split('.');
  if (parts.length < 2) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const n = Number(payload?.sub);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  } catch {
    return undefined;
  }
}

@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    userContext.run({ userId: decodeUserId(req) }, () => next());
  }
}
