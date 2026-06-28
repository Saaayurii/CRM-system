import { ConfigService } from '@nestjs/config';

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
