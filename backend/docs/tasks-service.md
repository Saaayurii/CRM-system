# Tasks Service (`port 3004`)

## Назначение
Управляет задачами внутри проектов: создание, редактирование, удаление, назначение исполнителей. Поддерживает фильтрацию по проекту, статусу и исполнителю, а также сбор статистики. Дополнительные модули: комментарии к задачам, история статусов, учёт рабочего времени.

## Ключевые эндпоинты
- `GET    /tasks` — список задач (фильтры: projectId, status, assignedToUserId)
- `GET    /tasks/stats` — статистика задач по аккаунту/проекту
- `GET    /tasks/project/:projectId` — задачи конкретного проекта
- `GET    /tasks/:id` — данные задачи
- `POST   /tasks` — создание задачи
- `PUT    /tasks/:id` — обновление задачи
- `DELETE /tasks/:id` — удаление задачи
- `POST   /tasks/:id/assignees` — назначение исполнителей (заменяет список)
- `GET    /tasks/:id/assignees` — список исполнителей задачи
- `GET    /task-comments` — комментарии к задаче
- `POST   /task-comments` — добавить комментарий
- `GET    /task-time-logs` — логи времени по задаче
- `POST   /task-time-logs` — зафиксировать затраченное время

## Модели данных (Prisma)
- `Task` — задача (title, description, status, priority, projectId, createdByUserId, accountId, dueDate)
- `TaskAssignee` — исполнитель задачи (taskId, userId, userName)
- `TaskComment` — комментарий (taskId, userId, content)
- `TaskStatusHistory` — история изменений статуса
- `TaskTimeLog` — запись о затраченном времени (taskId, userId, minutes)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- При назначении исполнителей через `POST /tasks/:id/assignees` старый список заменяется новым полностью
- Поддерживается два формата тела: `{ assignees: [{userId, userName}] }` и устаревший `{ userIds: [] }`
