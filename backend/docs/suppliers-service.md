# Suppliers Service (`port 3006`)

## Назначение
Управляет поставщиками и подрядчиками: ведение справочника контрагентов, привязка номенклатуры материалов к поставщику, оформление заказов поставщикам. Поддерживает фильтрацию по статусу активности и мягкое удаление.

## Ключевые эндпоинты
- `GET    /suppliers` — список поставщиков (фильтр по status: 0-inactive, 1-active)
- `GET    /suppliers/:id` — данные поставщика
- `POST   /suppliers` — создание поставщика
- `PUT    /suppliers/:id` — обновление поставщика
- `DELETE /suppliers/:id` — мягкое удаление
- `GET    /suppliers/:id/materials` — материалы, поставляемые поставщиком
- `POST   /suppliers/:id/materials` — привязка материала к поставщику
- `GET    /contractors` — список подрядчиков
- `POST   /contractors` — создание подрядчика
- `PUT    /contractors/:id` — обновление подрядчика
- `DELETE /contractors/:id` — удаление подрядчика
- `GET    /supplier-orders` — заказы поставщикам
- `POST   /supplier-orders` — создание заказа

## Модели данных (Prisma)
- `Supplier` — поставщик (name, inn, contactPerson, phone, email, status, accountId, deletedAt)
- `SupplierMaterial` — привязка материала к поставщику с ценой
- `Contractor` — подрядчик (name, specialization, accountId)
- `SupplierOrder` — заказ поставщику (supplierId, status, totalAmount, accountId)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Один поставщик может поставлять несколько материалов с разными ценами
- Подрядчики и поставщики — отдельные сущности
