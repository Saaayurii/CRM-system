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

## Источник событий: relay поверх `audit.row_history` (transactional outbox)
Раньше доменные события порождал **только** `AuditInterceptor` в gateway — по HTTP-глаголу.
Минус: запись в обход gateway (фоновые джобы BullMQ, ручной SQL) **не порождала событие**,
и automation такие изменения молча пропускала. Теперь источник правды — **сама запись в БД**.

- **`RowHistoryRelayService`** (audit-service) тейлит таблицу `audit.row_history` (её
  заполняют DB-триггеры на 38 таблиц — ловят ЛЮБУЮ запись, даже мимо gateway) по
  durable-курсору `audit.row_history_relay_cursor (last_id)` и публикует каждое изменение в
  тот же топик `audit.events`. Форма payload идентична gateway-варианту, поэтому оба
  consumer'а (audit-persist + automation-react) работают без изменений.
- **Маппинг строки → событие:** `table_name`→`entityType` (как в gateway `PATH_TO_ENTITY`),
  `op`→`action` (INSERT→create, DELETE→delete, UPDATE→update; UPDATE с выставленным
  `deleted_at`→delete = soft-delete), `accountId`/`projectId` из JSONB-строки, `userId` из
  `changed_by`, `entityId` из `row_id`. Секреты (`password_*`, `*_token`, `passport_data`…)
  вырезаются.
- **At-least-once:** курсор двигается только за успешно опубликованные строки — сбой
  Kafka/БД ставит поток на паузу (не теряет) и продолжает с того же места; consumer'ы
  терпят редкий дубль. Первый старт начинает с текущего `MAX(id)` (не переигрывает бэклог).
  Курсор само-создаётся на boot (`ensureCursor`) — деплой кода не гонится с SQL-миграцией
  `database/migrations/audit_row_history_relay.sql`.
- **Дедуп с gateway:** каждая таблица принадлежит ровно одному producer'у. При включённой
  Kafka `AuditInterceptor` **уступает** релею ресурсы, чьи таблицы под триггерами
  (`RELAY_OWNED_SEGMENTS` ≈ `audited_tables`) — не эмитит по ним. Не-аудируемые ресурсы
  (tasks, materials, calendar) и auth-события (login/logout) по-прежнему эмитит gateway.
  **Исключение — `registration_requests`:** остаётся за gateway (богатые `approve`/`reject`),
  поэтому его НЕТ в `RELAY_OWNED_SEGMENTS`, а релей его пропускает через
  `RELAY_EXCLUDED_TABLES`. При выключенной Kafka релей не активен, gateway шлёт всё по
  HTTP-фоллбэку, как раньше.
- ⚠️ `RELAY_OWNED_SEGMENTS` (gateway) и `TABLE_TO_ENTITY` (релей) надо держать в синхроне с
  массивом `audited_tables` в `audit_row_history.sql` при добавлении новых аудируемых таблиц.

### Семантические события: transactional outbox (`OutboxRelayService`, вариант B)
Row-history relay даёт события на уровне строки (`entity.create/update/delete`) — ловит всё,
но не знает бизнес-смысла. Для **семантических** событий (`task.status_changed`, `deal.won`…)
есть второй релей-сиблинг `OutboxRelayService`: тейлит `public.event_outbox` по своему
курсору (`event_outbox_relay_cursor`) и публикует в тот же `audit.events` (eventType
`domain_event`). Тот же at-least-once / self-create cursor / старт с MAX(id).
- **Producer — доменные сервисы**, а не audit-service: `OutboxService.emitWith(tx, event)`
  пишет строку в `event_outbox` **в той же транзакции**, что и бизнес-запись (атомарно —
  событие комитится ⇔ изменение комитится; raw SQL, без Prisma-модели, копируется в любой
  сервис). Эталон — `tasks-service` (`task.status_changed`, см. tasks-service.md).
- Миграция `database/migrations/event_outbox.sql` (релей и сам создаёт курсор на boot).
- A и B дополняют друг друга: A — полнота (любая запись), B — смысл (для конкретных событий).
