# API Gateway (`port 3000`)

## Назначение
Единая точка входа для всех внешних запросов. Принимает HTTP-запросы от фронтенда, проверяет JWT-токен (через `JwtAuthGuard`), применяет rate limiting (10 запросов/мин для auth-эндпоинтов), затем проксирует запрос в соответствующий микросервис через `ProxyService`. Также обслуживает загрузку файлов (аватары, логотипы, вложения, CSV-отчёты).

## Ключевые эндпоинты
- `POST /api/v1/auth/login` — авторизация пользователя
- `POST /api/v1/auth/register` — регистрация пользователя
- `POST /api/v1/auth/register-company` — регистрация новой компании
- `GET  /api/v1/auth/me` — профиль текущего пользователя
- `POST /api/v1/users/upload-avatar` — загрузка аватара (multipart)
- `POST /api/v1/auth/logo` — загрузка логотипа компании (multipart)
- `POST /api/v1/chat-channels/:id/upload` — загрузка файла в чат (multipart)
- `POST /api/v1/hr/upload-avatar` — загрузка фото сотрудника (multipart)
- `GET  /api/v1/health` — проверка состояния шлюза
- `*    /api/v1/<service>/*` — проксирование ко всем 23 микросервисам

## Модели данных (Prisma)
Шлюз не имеет собственной Prisma-модели — хранит состояние только в Redis.

## Переменные окружения
- `AUTH_SERVICE_URL` — URL auth-service
- `USERS_SERVICE_URL` — URL users-service
- `JWT_ACCESS_SECRET` — секрет для верификации JWT
- `REDIS_HOST` / `REDIS_PORT` — Redis для rate limiting и сессий
- `UPLOAD_DEST` — локальная папка для загруженных файлов

## Особенности
- Все маршруты защищены `JwtAuthGuard` по умолчанию; публичные помечены `@Public()`
- **Статика `/uploads/*` авторизуется** (`createUploadsAuthMiddleware`, до `useStaticAssets`)
  — **за флагом `UPLOADS_AUTH=true` (по умолчанию ВЫКЛ)**. Токен из cookie `crm_at` /
  `Authorization: Bearer` / `?token=` верифицируется тем же `JWT_ACCESS_SECRET` (при
  `JWT_PUBLIC_KEY` — RS256). Без валидного токена — 401. Браузер сам шлёт httpOnly-cookie на
  `<img src="/uploads/...">` и открытие PDF (same-origin), поэтому у авторизованных
  пользователей файлы грузятся без изменений на фронте. Публичный allowlist — только логотипы
  (`/uploads/logos/*`, показываются на странице логина до входа). Прод обычно на S3
  (`STORAGE_PROVIDER=s3`), local `/uploads` — dev/fallback.
  > ⚠️ Включать `UPLOADS_AUTH=true` только ПОСЛЕ выката cookie-слоя (`crm_at`): иначе браузер
  > не сможет прислать токен на `<img>`/PDF и файлы начнут отдавать 401.
- **Security-заголовки** на всех ответах шлюза: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`
  (в prod). `X-Powered-By` отключён (`app.disable('x-powered-by')`). Фронт (Next.js) выставляет
  свой набор (CSP/HSTS/…) в `next.config.ts`.
- **JWT валидируется локально** (HS256 по общему `JWT_ACCESS_SECRET`) — без HTTP-запроса в
  auth-service на каждый запрос. Дополнительно `JwtStrategy` проверяет Redis-блэклист
  `sess:revoked:<sid>` (`SessionRevocationService`) → отозванная сессия отвергается 401 в
  пределах ~TTL токена. Lookup fail-open при недоступном Redis.
- **Устойчивость межсервисных вызовов** (`ProxyService.forward`): per-request таймаут (15с
  дефолт, override `timeoutMs`), ретраи только для идемпотентных GET (exp backoff), и
  circuit breaker на каждый downstream (5 отказов сети/таймаута/5xx → circuit open, fail-fast
  503 на 15с, затем half-open проба). 4xx брейкер не трогает.
- Rate limiting реализован через `@nestjs/throttler` с Redis-хранилищем
- `ProxyService` пробрасывает заголовки `Authorization`, `X-User-Id`, `X-Account-Id` в downstream
- Поддерживается импорт Telegram-экспорта через `POST /api/v1/chat-channels/import-telegram`
- **Аудит через Kafka**: глобальный `AuditInterceptor` публикует write-действия в топик
  `audit.events` (`KafkaProducerService`, raw `kafkajs`); при недоступной/выключенной Kafka
  (`KAFKA_BROKERS` пуст) — fallback на `POST /event-logs` в audit-service по HTTP.
