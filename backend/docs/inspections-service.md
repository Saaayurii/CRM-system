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
- **Семантическое событие при смене статуса** (transactional outbox, вариант B): сервис кладёт
  событие в `public.event_outbox` **в той же транзакции**, что и апдейт инспекции
  (`InspectionRepository.update` в `$transaction`, `OutboxService.emitWith`). Статус 3
  («провалена») → distinct action **`inspection.failed`** (можно триггерить automation); прочие
  переходы → `inspection.status_changed` (`changes.status.{from,to}`). Дополняет плоский
  `inspection.update` от row-history relay (вариант A). См. audit-service.md.

## Планы/чертежи с разметкой дефектов (Site Plans, как в PlanRadar)
Модуль `site-plans`: растровая подложка (этаж/фасад/разрез), на которой дефекты
расставляются точками-пинами.
- Эндпоинты: `GET/POST /site-plans`, `GET/PUT/DELETE /site-plans/:id`
  (`GET /site-plans/:id` отдаёт план вместе с его дефектами-пинами). Мягкое удаление
  через `deleted_at`.
- Модель `SitePlan` (таблица `site_plans`): `title`, `imageUrl`, `projectId?`,
  `constructionSiteId?`, `width/height` (натуральные размеры картинки). Картинка
  грузится через существующий `POST /inspections/upload` (S3, отдаёт `fileUrl`).
- Привязка дефекта к плану: у `Defect` добавлено поле `planId` (+ существующее
  `coordinates`). Координата пина хранится в `coordinates` как `{ x, y }` (доли 0..1
  от размеров изображения, как `ControlPoint.scheme.pins`). Пин = `POST /defects`
  с `planId`+`coordinates` (новый дефект) либо `PUT /defects/:id` с
  `planId`+`coordinates` (привязать существующий); снятие — `planId:null, coordinates:null`.
- Фронт: `/dashboard/technadzor/plans` (список+загрузка) и `/plans/[id]`
  (просмотрщик: клик по плану → новый/привязать дефект, клик по пину → карточка).
- Миграция `database/migrations/technadzor_site_plans.sql`.
