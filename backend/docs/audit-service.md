# Audit Service (`port 3017`)

## Назначение
Записывает и хранит журнал событий (audit log) всех значимых действий в системе: создание, изменение, удаление сущностей. Принимает события от других микросервисов через внутренний публичный endpoint. Поддерживает фильтрацию по типу сущности и пользователю.

## Ключевые эндпоинты
- `GET  /event-logs` — список событий аккаунта (фильтры: entityType, userId)
- `GET  /event-logs/:id` — событие по ID
- `POST /event-logs` — создать запись события (публичный, вызывается другими сервисами)

## Модели данных (Prisma)
- `EventLog` — запись события (accountId, userId, entityType, entityId, action, oldValue: JSONB, newValue: JSONB, createdAt)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT
- `KAFKA_BROKERS` — брокеры Kafka через запятую (пусто → consumer не стартует, только HTTP)

## Особенности
- Endpoint `POST /event-logs` помечен `@Public()` — принимает запросы без JWT для записи событий из других сервисов
- Если JWT присутствует, `accountId` берётся из токена; иначе из тела запроса или defaults to 1
- Хранит `oldValue`/`newValue` для полного аудита изменений

## Шина событий (Kafka)
Основной путь аудита — **Kafka** (raw `kafkajs`), HTTP-эндпоинт оставлен как fallback/совместимость.
- **Producer** — `AuditInterceptor` в api-gateway: на каждое значимое write-действие (POST/PUT/PATCH/DELETE,
  кроме health/upload/chat/refresh) публикует событие в топик `audit.events`. Если Kafka недоступна/выключена —
  откатывается на `POST /event-logs` по HTTP (прежнее поведение).
- **Consumer** — `AuditConsumerService` (group `audit-service`) читает `audit.events` и пишет через тот же
  `EventLogsService.create`. Старт не блокируется: при недоступном брокере переподключается в фоне (раз в 10с).
- `KAFKA_BROKERS` пустой → consumer не поднимается, gateway шлёт аудит по HTTP. Топик авто-создаётся.
