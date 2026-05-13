# Chat Service (`port 3011`)

## Назначение
Реализует корпоративный мессенджер с поддержкой каналов (публичных и приватных), участников, сообщений с курсорной пагинацией и WebSocket для real-time доставки. Поддерживает редактирование/мягкое удаление сообщений, заглушение участников, а также импорт экспорта Telegram-чата.

## Ключевые эндпоинты
- `GET    /chat-channels` — список каналов пользователя (фильтр по projectId)
- `GET    /chat-channels/unread-summary` — счётчики непрочитанных по каналам
- `POST   /chat-channels` — создать канал
- `POST   /chat-channels/import-telegram` — импорт из Telegram-экспорта
- `GET    /chat-channels/:id` — данные канала
- `PUT    /chat-channels/:id` — обновить канал
- `DELETE /chat-channels/:id` — удалить канал
- `GET    /chat-channels/:id/members` — участники канала
- `POST   /chat-channels/:id/members` — добавить участника
- `PATCH  /chat-channels/:id/members/:userId` — заглушить/разглушить участника
- `DELETE /chat-channels/:id/members/:userId` — удалить участника
- `GET    /chat-channels/:id/messages` — сообщения (курсорная пагинация по `?cursor=`)
- `POST   /chat-channels/:id/messages` — отправить сообщение
- `PUT    /chat-channels/messages/:id` — редактировать сообщение
- `DELETE /chat-channels/messages/:id` — мягкое удаление сообщения

## Модели данных (Prisma)
- `ChatChannel` — канал (name, type, projectId, accountId)
- `ChatChannelMember` — участник канала (channelId, userId, isMuted, lastReadAt)
- `ChatMessage` — сообщение (channelId, userId, content, fileUrl, deletedAt)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Сообщения загружаются с курсорной пагинацией (по ID сообщения), а не по номеру страницы
- WebSocket-шлюз (`chat.gateway.ts`) обеспечивает real-time рассылку новых сообщений
- Импорт Telegram принимает JSON-экспорт и создаёт канал с историей сообщений
