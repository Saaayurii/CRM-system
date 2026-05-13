# Equipment Service (`port 3013`)

## Назначение
Ведёт учёт строительной техники и оборудования: инвентаризация, статусы (в работе, на ремонте, на складе), привязка к строительным объектам, журнал технического обслуживания. Поддерживает фильтрацию по статусу и объекту.

## Ключевые эндпоинты
- `GET    /equipment` — список оборудования (фильтры: status, siteId)
- `GET    /equipment/:id` — данные оборудования
- `POST   /equipment` — добавление единицы оборудования
- `PUT    /equipment/:id` — обновление данных
- `DELETE /equipment/:id` — удаление оборудования
- `GET    /equipment-maintenance` — записи технического обслуживания
- `POST   /equipment-maintenance` — создание записи ТО
- `PUT    /equipment-maintenance/:id` — обновление записи ТО
- `DELETE /equipment-maintenance/:id` — удаление записи ТО

## Модели данных (Prisma)
- `Equipment` — оборудование (name, serialNumber, status, siteId, accountId)
- `EquipmentMaintenance` — запись ТО (equipmentId, date, description, cost, nextMaintenanceDate)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Доступ контролируется через `JwtAuthGuard`
- Оборудование опционально привязывается к строительному объекту (`siteId`)
