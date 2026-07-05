import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

/**
 * Опции ключа для JwtStrategy с поддержкой перехода HS256 → RS256.
 *
 * - JWT_PUBLIC_KEY задан (RS256 public PEM) → валидируем ОБА алгоритма: RS256 по
 *   публичному ключу, HS256 по старому секрету (для токенов, выданных до
 *   переключения подписи, в пределах их TTL). alg берётся из заголовка JWT.
 * - JWT_PUBLIC_KEY НЕ задан → поведение прежнее: только HS256 по секрету.
 *
 * Делает выкатку кода безопасной: без env-ключей поведение байт-в-байт прежнее.
 * PEM из env может прийти одной строкой с literal "\n" — нормализуем.
 */
function normalizePem(v?: string): string {
  return v ? v.replace(/\\n/g, '\n') : '';
}

// Возвращаемый тип намеренно `any`: спред в super({...}) StrategyOptions требует
// secretOrKey|secretOrKeyProvider как обязательное; спред `any` снимает эту
// проверку (мы гарантируем одно из них в рантайме ниже).
export function buildJwtKeyOptions(config: ConfigService): any {
  const secret = config.get<string>('jwt.accessSecret') || 'default-secret';
  const publicKey = normalizePem(process.env.JWT_PUBLIC_KEY);

  if (publicKey) {
    return {
      algorithms: ['RS256', 'HS256'],
      secretOrKeyProvider: (
        _req: unknown,
        rawJwt: string,
        done: (err: unknown, key?: string) => void,
      ) => {
        try {
          const header = JSON.parse(
            Buffer.from(String(rawJwt).split('.')[0], 'base64url').toString('utf8'),
          );
          done(null, header?.alg === 'RS256' ? publicKey : secret);
        } catch {
          done(null, secret);
        }
      },
    };
  }
  return { algorithms: ['HS256'], secretOrKey: secret };
}

/**
 * RS256/HS256-совместимая проверка токена для WS-путей (chat.gateway,
 * ws-jwt.guard), где используется сырой jsonwebtoken.verify, а не JwtStrategy.
 * Логика зеркалит buildJwtKeyOptions: при заданном JWT_PUBLIC_KEY выбираем ключ
 * по alg из заголовка, иначе — прежний HS256 по секрету.
 */
export function verifyJwtToken(token: string, config: ConfigService): any {
  const secret = config.get<string>('jwt.accessSecret') || 'default-secret';
  const publicKey = normalizePem(process.env.JWT_PUBLIC_KEY);
  if (publicKey) {
    let key = secret;
    try {
      const header = JSON.parse(
        Buffer.from(String(token).split('.')[0], 'base64url').toString('utf8'),
      );
      if (header?.alg === 'RS256') key = publicKey;
    } catch {
      /* оставляем HS256-секрет */
    }
    return jwt.verify(token, key, { algorithms: ['RS256', 'HS256'] });
  }
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

/**
 * Достаёт access-токен из socket.io-хендшейка. Порядок: явный `auth.token`
 * (старый клиент), затем заголовок Authorization, затем httpOnly-cookie `crm_at`
 * (после перехода на cookie-авторизацию токен в JS недоступен, но хендшейк
 * несёт cookie). Возвращает null, если токена нет.
 */
export function tokenFromHandshake(handshake: any): string | null {
  const fromAuth = handshake?.auth?.token;
  if (fromAuth) return fromAuth;
  const fromHeader = handshake?.headers?.authorization?.replace('Bearer ', '');
  if (fromHeader) return fromHeader;
  const cookie: string | undefined = handshake?.headers?.cookie;
  if (cookie) {
    const m = cookie.match(/(?:^|;\s*)crm_at=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}
