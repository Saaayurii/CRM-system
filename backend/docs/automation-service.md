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

## Особенности
- Конфигурации триггера и действия хранятся как JSONB для гибкости
- При создании правила фиксируется `createdByUserId` из JWT
- Журнал выполнения помогает отлаживать сработавшие/не сработавшие правила
