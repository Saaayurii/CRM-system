# Projects Service (`port 3003`)

## Назначение
Управляет строительными проектами и объектами (construction sites): создание, редактирование, мягкое удаление, фильтрация по статусу. Реализует управление командой проекта — добавление/удаление участников. Поддерживает назначение пользователей на объекты через отдельный модуль user-assignments.

## Ключевые эндпоинты
- `GET    /projects` — список проектов (фильтр по status: 0-draft, 1-active, 2-paused, 3-completed, 4-cancelled)
- `GET    /projects/:id` — данные проекта
- `POST   /projects` — создание проекта
- `PUT    /projects/:id` — обновление проекта
- `DELETE /projects/:id` — мягкое удаление
- `GET    /projects/:id/team` — участники команды проекта
- `POST   /projects/:id/team` — добавление участника команды
- `DELETE /projects/:id/team/:teamId` — удаление участника
- `GET    /construction-sites` — список строительных объектов
- `POST   /construction-sites` — создание объекта
- `PUT    /construction-sites/:id` — обновление объекта

## Модели данных (Prisma)
- `Project` — проект (name, code, status, startDate, endDate, accountId, deletedAt)
- `ConstructionSite` — строительный объект (address, projectId, status)
- `ProjectTeamMember` — участник команды (projectId, userId, role)
- `UserAssignment` — назначение пользователя на объект

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Код проекта (`code`) уникален в рамках аккаунта
- Команда проекта отличается от команды HR: это привязка конкретных пользователей к проекту
