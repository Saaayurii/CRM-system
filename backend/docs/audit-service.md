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

## Особенности
- Endpoint `POST /event-logs` помечен `@Public()` — принимает запросы без JWT для записи событий из других сервисов
- Если JWT присутствует, `accountId` берётся из токена; иначе из тела запроса или defaults to 1
- Хранит `oldValue`/`newValue` для полного аудита изменений
