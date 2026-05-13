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
- Rate limiting реализован через `@nestjs/throttler` с Redis-хранилищем
- `ProxyService` пробрасывает заголовки `Authorization`, `X-User-Id`, `X-Account-Id` в downstream
- Поддерживается импорт Telegram-экспорта через `POST /api/v1/chat-channels/import-telegram`
