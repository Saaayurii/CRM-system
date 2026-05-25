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
