# Inspections Service (`port 3008`)

## Назначение
Управляет контролем качества на строительных объектах: проведение инспекций с чек-листами, фиксация дефектов с фото и описанием, ведение шаблонов инспекций для повторного использования. Поддерживает фильтрацию по статусу и проекту.

## Ключевые эндпоинты
- `GET    /inspections` — список инспекций (фильтры: status, projectId)
- `GET    /inspections/:id` — данные инспекции
- `POST   /inspections` — создание инспекции
- `PUT    /inspections/:id` — обновление инспекции
- `DELETE /inspections/:id` — удаление инспекции
- `GET    /inspection-templates` — список шаблонов инспекций
- `GET    /inspection-templates/:id` — шаблон по ID
- `POST   /inspection-templates` — создание шаблона
- `PUT    /inspection-templates/:id` — обновление шаблона
- `DELETE /inspection-templates/:id` — удаление шаблона
- `GET    /defects` — список дефектов
- `POST   /defects` — создание дефекта
- `PUT    /defects/:id` — обновление дефекта
- `DELETE /defects/:id` — удаление дефекта

## Модели данных (Prisma)
- `Inspection` — инспекция (projectId, inspectorId, status, scheduledDate, accountId)
- `InspectionTemplate` — шаблон чек-листа (name, items: JSONB, accountId)
- `Defect` — дефект (inspectionId, description, severity, status, photoUrl, accountId)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Шаблоны инспекций содержат JSONB-поле с пунктами чек-листа
- Дефекты привязаны к конкретной инспекции
- Доступ контролируется через `JwtAuthGuard`
