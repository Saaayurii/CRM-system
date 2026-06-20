# Notifications Service (`port 3010`)

## Назначение
Обеспечивает доставку уведомлений и объявлений пользователям через несколько каналов: SSE (Server-Sent Events) для real-time доставки в браузер, Web Push (VAPID) для push-уведомлений, а также хранение уведомлений в БД с поддержкой отметки прочитанного. Используется другими сервисами через внутренний endpoint.

## Ключевые эндпоинты
- `GET  /notifications/events` — SSE-поток уведомлений (аутентификация по query-параметру `?token=`)
- `POST /notifications/internal/force-logout` — внутренний: отправить событие принудительного выхода пользователю
- `POST /notifications/internal/chat-channel-read` — внутренний: пользователь прочитал чат-канал → удалить все его `chat_message`-уведомления по каналу + SSE `notification_deleted` (вызывается chat-service из `markAsRead`)
- `GET  /notifications/vapid-public-key` — публичный VAPID-ключ для Web Push
- `POST /notifications/push-subscribe` — сохранить подписку на Web Push
- `DELETE /notifications/push-subscribe` — удалить подписку на Web Push
- `GET  /notifications` — список уведомлений текущего пользователя (фильтр по isRead)
- `POST /notifications` — создать уведомление
- `PUT  /notifications/:id` — обновить уведомление
- `PUT  /notifications/:id/read` — отметить уведомление прочитанным
- `GET  /announcements` — список объявлений аккаунта
- `POST /announcements` — создать объявление
- `PUT  /announcements/:id` — обновить объявление
- `DELETE /announcements/:id` — удалить объявление

## Модели данных (Prisma)
- `Notification` — уведомление (userId, accountId, type, title, body, isRead, createdAt)
- `Announcement` — объявление для всего аккаунта (accountId, authorId, title, body)
- `PushSubscription` — подписка на Web Push (userId, endpoint, keys)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — ключи для Web Push

## Особенности
- SSE-поток авторизуется по query-параметру `token` (не по заголовку Authorization)
- Событие `force_logout` передаётся через SSE при отзыве сессии из другого сервиса
- Объявления видны всем пользователям аккаунта, уведомления — персональные

## Фоновые задачи (BullMQ)
Работает на общем Redis (`redis.host/port`), воркеры — в процессе сервиса. Очереди:
- **`push`** — Web Push (`sendWebPushToUser`) с ретраями; `createNotification` кладёт джобу,
  с fallback на инлайн-отправку, если очередь недоступна.
- **`notifications-jobs`** — три типа джоб:
  - `cleanup` (repeatable, раз в сутки) — удаляет прочитанные уведомления старше 30 дней.
  - `reminders` (repeatable, раз в сутки) — `ReminderService` сканирует общую БД **raw SQL**
    и создаёт напоминания (через `createNotification`): задачи (`due_date`→исполнителям),
    инспекции (`scheduled_date`→инспектору), ТО техники (`next_maintenance_date`→ответственному),
    события календаря (`start_datetime`→организатору), обучение ОТ
    (`safety_training_records.expiry_date`) и инструктажи (`safety_briefing_participants.valid_until`)
    →сотруднику. Дедуп — через саму таблицу `notifications` (`hasRecentReminder`, ~20ч);
    берётся последняя запись на пользователя. Окно: сутки (даты/события), 7 дней (продление ОТ).
  - `broadcast` — фан-аут `broadcastNotification` уносится в очередь (`runBroadcast` в воркере).
- `jsonwebtoken` — явная зависимость (SSE авторизуется по токену в query).
