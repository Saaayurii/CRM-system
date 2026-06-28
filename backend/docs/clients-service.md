# Clients Service (`port 3018`)

## Назначение
Управляет клиентской базой компании: заказчики, физические или юридические лица, история взаимодействий, доступ клиентов к клиентскому порталу. Поддерживает фильтрацию по статусу и менеджеру. Все данные изолированы по `accountId`.

## Ключевые эндпоинты
- `GET    /clients` — список клиентов (фильтры: status, managerId)
- `GET    /clients/:id` — карточка клиента
- `POST   /clients` — создание клиента
- `PUT    /clients/:id` — обновление данных
- `DELETE /clients/:id` — удаление клиента
- `GET    /client-interactions` — история взаимодействий с клиентом
- `POST   /client-interactions` — добавить взаимодействие
- `PUT    /client-interactions/:id` — обновить взаимодействие
- `DELETE /client-interactions/:id` — удалить взаимодействие
- `GET    /client-portal-access` — записи доступа к порталу
- `POST   /client-portal-access` — выдать доступ к порталу
- `DELETE /client-portal-access/:id` — отозвать доступ

## Модели данных (Prisma)
- `Client` — клиент (name, type, phone, email, status, managerId, accountId)
- `ClientInteraction` — взаимодействие (clientId, userId, type, date, description)
- `ClientPortalAccess` — доступ к порталу (clientId, login, passwordHash)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Клиентский портал — отдельная функция, позволяющая клиенту просматривать статус проекта
- История взаимодействий фиксирует звонки, встречи, письма

## Фоновые задачи (BullMQ)
На общем Redis (`redis.host/port`), воркер в процессе сервиса:
- **`client-chat`** — при выдаче доступа к порталу (`createChat !== false`) создание чат-канала
  «Клиент — {проект}» уносится в очередь (3 ретрая, exp backoff). Сам доступ к порталу
  создаётся синхронно и **не зависит** от доступности chat-service. Продьюсер
  (`enqueueClientChat`) при недоступной очереди/Redis падает в инлайн fire-and-forget
  (`createClientChannel`, не блокирует ответ). Воркер бросает исключение на реальной ошибке
  HTTP → очередь ретраит; «нет chatUrl/токена/клиента» — просто `return` без ретрая.

## Воронка продаж (Deals / Kanban)
Модуль `deals` (две сущности в одном модуле): сделки + настраиваемые стадии воронки.
- Эндпоинты: `GET /deals` (фильтры `status`/`managerId`/`clientId`), `GET /deals/stats`
  (сумма+кол-во открытых по стадиям), `GET/POST /deals`, `GET/PUT/DELETE /deals/:id`;
  `GET/POST /deal-stages`, `PUT/DELETE /deal-stages/:id`.
- Модели: `DealStage` (`deal_stages`: name, color, sortOrder, isWon, isLost) —
  кастомные колонки Kanban на аккаунт; `GET /deal-stages` **сидирует дефолтную воронку**
  (Новая→Квалификация→Переговоры→Договор→Выиграна/Проиграна), если стадий ещё нет.
  `Deal` (`deals`: title, amount, currency, status `open|won|lost`, stageId, clientId?,
  projectId?, assignedManagerId?, expectedCloseDate?, sortOrder).
- Перемещение между стадиями = `PUT /deals/:id { stageId }`. Если у стадии `isWon`/`isLost` —
  сервис сам выставляет `status` + `wonAt`/`lostAt`. При первом переходе в won —
  broadcast-уведомление (`deal_won`) админам/PM + менеджеру.
- Удаление стадии запрещено, если в ней есть сделки (перенесите сначала).
- Фронт: `/dashboard/deals` — Kanban с native HTML5 drag-drop (без новых зависимостей),
  отдельный пункт сайдбара «Сделки» (super_admin/admin/PM). Миграция
  `database/migrations/deals_pipeline.sql`.

## Клиентский портал (MVP)

### Создание доступа
`POST /client-portal-access` принимает дополнительные поля:
- `login`, `password` (>=8 символов) — для входа по логину/паролю; при наличии этих
  полей сервис автоматически создаёт `User` с `roleId = 15` (роль `client`) и
  сохраняет `userId` в `client_portal_access`.
- `createChat` (default `true`) — при включённом флаге сервис делает HTTP-запрос
  в `chat-service` для создания приватного канала «Клиент — {проект}» с
  участием нового user-аккаунта клиента.
- `accessToken` генерируется автоматически (32-байтовый hex), если не передан.

### Авторизация клиента
Эндпоинты живут в `auth-service`:
- `POST /auth/portal/login` — `{ login, password }` → JWT с `roleId = 15` и `clientId`.
- `POST /auth/portal/magic` — `{ token }` (значение `accessToken`) → тот же JWT.

### Read-only режим
`api-gateway` использует глобальный `ClientReadOnlyGuard`: при `roleId = 15` все
write-методы блокируются 403, кроме узкого whitelist (чаты, refresh/logout,
push-подписки, отметка уведомлений прочитанными).

### Фильтрация по проектам
`projects-service` сам определяет список доступных проектов по
`client_portal_access (user_id = current user)` через `getClientAllowedProjectIds`.
Для остальных сервисов (tasks, documents, finance и т. д.) тонкая фильтрация —
TODO следующего этапа: сейчас read-only гард блокирует записи, а accountId уже
изолирует ответы в рамках одной компании.
