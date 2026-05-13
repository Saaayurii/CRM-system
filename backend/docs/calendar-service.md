# Calendar Service (`port 3012`)

## Назначение
Управляет событиями корпоративного календаря: совещания, дедлайны, инспекции, выезды на объект. Поддерживает фильтрацию по проекту и временному диапазону (startDate/endDate). Все события изолированы по `accountId`.

## Ключевые эндпоинты
- `GET    /calendar-events` — список событий (фильтры: projectId, startDate, endDate)
- `GET    /calendar-events/:id` — данные события
- `POST   /calendar-events` — создание события
- `PUT    /calendar-events/:id` — обновление события
- `DELETE /calendar-events/:id` — удаление события

## Модели данных (Prisma)
- `CalendarEvent` — событие (title, description, startDate, endDate, type, projectId, accountId, createdByUserId)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Фильтрация по `startDate` и `endDate` позволяет загружать события для конкретного месяца/недели
- События могут быть привязаны к проекту (поле `projectId` опционально)
