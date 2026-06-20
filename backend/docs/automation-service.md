# Automation Service (`port 3021`)

## Назначение
Управляет автоматизацией бизнес-процессов: настройка правил типа «триггер → действие» (например, при смене статуса задачи — отправить уведомление). Хранит журнал выполнения правил. Все правила изолированы по `accountId`.

## Ключевые эндпоинты
- `GET    /automation-rules` — список правил автоматизации
- `GET    /automation-rules/:id` — правило по ID
- `POST   /automation-rules` — создать правило
- `PUT    /automation-rules/:id` — обновить правило
- `DELETE /automation-rules/:id` — удалить правило
- `GET    /execution-logs` — журнал выполнения автоматизаций
- `GET    /execution-logs/:id` — запись журнала по ID

## Модели данных (Prisma)
- `AutomationRule` — правило (name, triggerType, triggerConfig: JSONB, actionType, actionConfig: JSONB, isActive, accountId, createdByUserId)
- `ExecutionLog` — запись выполнения (ruleId, status, executedAt, details: JSONB)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT
- `KAFKA_BROKERS` — брокеры Kafka через запятую (пусто → движок автоматизации выключен)
- `NOTIFICATIONS_SERVICE_URL` — для действия `notify`

## Особенности
- Конфигурации триггера и действия хранятся как JSONB для гибкости
- При создании правила фиксируется `createdByUserId` из JWT
- Журнал выполнения помогает отлаживать сработавшие/не сработавшие правила

## Движок автоматизации (Kafka)
`AutomationConsumerService` — **второй независимый consumer** топика `audit.events`
(group `automation-service`; аудит *сохраняет* события, автоматизация *реагирует* — это
и есть one-to-many ради которого взяли Kafka). На каждое событие `RuleEngineService`:
1. берёт активные правила аккаунта (`findActiveByAccount`);
2. матчит по **триггеру** `triggerEvent` формата `"<entityType>.<action>"` с поддержкой
   `*` (`task.*`, `*.delete`, `*`) — ключ события `${entityType}.${action}`;
3. проверяет **`triggerConditions`** (JSON, поверхностное равенство по `action/entityType/
   entityId/userId`; пусто = всегда матч);
4. выполняет **`actions`** (JSON-массив):
   - `{ type: 'notify', roleIds?, userIds?, excludeActor?, title, message?, priority?, actionUrl? }`
     → broadcast в notifications-service. В `title/message` доступны плейсхолдеры
     `{{entityType}} {{entityId}} {{description}} {{userId}}`.
   - `{ type: 'webhook', url, method?, headers? }` → HTTP-POST тела события на `url`.
5. пишет `automation_execution_log` (`triggerData/executionResult/success/errorMessage`) и
   инкрементит `execution_count` + `last_executed_at`.

Старт не блокируется (переподключение к брокеру в фоне), упавшее правило логируется и не
валит consumer.

**UI:** вкладка «Автоматизация» в админке (`/admin/automation`, super_admin) —
визуальный конструктор: сущность+действие → триггер, действия notify (роли,
заголовок/текст с плейсхолдерами, «не уведомлять инициатора») и webhook (URL),
список правил с тумблером вкл/выкл и счётчиком срабатываний. Поверх CRUD `/automation-rules`.
Пример правила (тело API): `{ "name":"Уведомить админов об удалении проекта",
"triggerEvent":"project.delete", "isActive":true, "actions":[{"type":"notify","roleIds":[1,2],
"excludeActor":true,"title":"Удалён проект #{{entityId}}","message":"{{description}}"}] }`.
