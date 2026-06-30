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
- `GET    /chat-channels/:id/messages` — сообщения (курсорная пагинация по `?cursor=`, фильтр `?topicId=`)
- `POST   /chat-channels/:id/messages` — отправить сообщение
- `PUT    /chat-channels/messages/:id` — редактировать сообщение
- `DELETE /chat-channels/messages/:id` — мягкое удаление сообщения
- `GET    /chat-channels/:id/topics` — список тем форум-канала (с непрочитанным и превью)
- `POST   /chat-channels/:id/topics` — создать тему
- `PUT    /chat-channels/:id/topics/:topicId` — изменить тему (имя/иконка/цвет, закрепить/закрыть)
- `DELETE /chat-channels/:id/topics/:topicId` — удалить тему (General защищена)
- `PATCH  /chat-channels/:id/topics/:topicId/read` — отметить тему прочитанной
- `PATCH  /chat-channels/:id/topics-config` — вкл/выкл режим тем + право на создание (админ)

## Модели данных (Prisma)
- `ChatChannel` — канал (name, type, projectId, accountId)
- `ChatChannelMember` — участник канала (channelId, userId, isMuted, lastReadAt)
- `ChatMessage` — сообщение (channelId, **topicId**, userId, content, fileUrl, deletedAt)
- `ChatTopic` — тема форум-канала (channelId, name, iconEmoji, color, isGeneral, isClosed, isPinned, lastMessageAt)
- `ChatTopicRead` — per-user per-topic состояние прочтения (topicId, userId, lastReadAt)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Сообщения загружаются с курсорной пагинацией (по ID сообщения), а не по номеру страницы
- WebSocket-шлюз (`chat.gateway.ts`) обеспечивает real-time рассылку новых сообщений
- Импорт Telegram принимает JSON-экспорт и создаёт канал с историей сообщений
- **Импорт Telegram асинхронный (BullMQ)**: канал создаётся синхронно (ответ с `channelId`
  сразу), а сообщения вставляются в фоне чанками по 100 через очередь `telegram-import`
  (`@nestjs/bullmq` на общем Redis). Большой экспорт не блокирует запрос и не валит gateway.
  При недоступной очереди — fallback на инлайн-вставку. Логика чанка — `insertTelegramMessages`.

## Темы (Telegram-style forum topics)
Групповой канал можно перевести в режим тем (`settings.topicsEnabled`), и тогда лента
делится на именованные ветки. Модель — **`topicId` на сообщении + таблица `chat_topics`**
(а не «тема = дочерний канал»): участники остаются на уровне канала, тема — это поток
сообщений с `topic_id`. Миграция `database/migrations/chat_topics.sql`.
- **Включение** (`PATCH /chat-channels/:id/topics-config`, только admin канала): при первом
  включении создаётся несносимая тема **«Общее» (General)** и все «бестемные» сообщения
  переносятся в неё (`setMessagesTopic`). `settings.createTopicsPermission` (`all|admins`) —
  кто может создавать темы (по умолчанию `all`).
- **Отправка**: `createMessage` для форум-канала кладёт сообщение в тему (без `topicId` —
  в General), запрещает запись в закрытую тему (`isClosed`) не-админам и двигает
  `topic.last_message_at`. В payload `message:new` есть `topicId` — клиент фильтрует по
  открытой теме (единая WS-комната `channel:<id>`, отдельных комнат на тему нет).
- **Непрочитанное**: per-user per-topic через `chat_topic_reads`; `getUnreadSummary` для
  форум-каналов = сумма непрочитанного по темам (обычные каналы — по `member.lastReadAt`,
  без изменений).
- **WS-события**: `topic:created/updated/deleted` (эмитятся контроллером в `channel:<id>`,
  как `burnMedia`), `topic:read` → `topic:read:updated`, `topics:config`.
- **Права**: создание — `createTopicsPermission`; закрытие/закрепление — admin канала;
  редактирование/удаление — admin или создатель темы; General удалить нельзя.
- Фронт: `TopicListView` (список тем вместо ленты) + `TopicFormModal` (имя/эмодзи/цвет);
  тумблеры «Темы»/«Создание тем» — в инфо-панели группы (`ChatWindow` → `InfoPanel`).
