# Materials Service (`port 3005`)

## Назначение
Управляет складским учётом материалов: каталог материалов с категориями, склады, заявки на материалы. Позволяет фильтровать материалы по категории, отслеживать остатки, создавать альтернативы для позиций. Все записи изолированы по `accountId`.

## Ключевые эндпоинты
- `GET    /materials` — список материалов (фильтр по categoryId)
- `GET    /materials/:id` — данные материала
- `POST   /materials` — создание материала
- `PUT    /materials/:id` — обновление материала
- `DELETE /materials/:id` — мягкое удаление
- `GET    /material-categories` — список категорий
- `GET    /material-categories/:id` — категория по ID
- `POST   /material-categories` — создание категории
- `PUT    /material-categories/:id` — обновление категории
- `DELETE /material-categories/:id` — удаление категории
- `GET    /warehouses` — список складов
- `POST   /warehouses` — создание склада
- `GET    /material-requests` — заявки на материалы
- `POST   /material-requests` — создание заявки

## Модели данных (Prisma)
- `Material` — материал (name, code, unit, categoryId, accountId, deletedAt)
- `MaterialCategory` — категория материала
- `Warehouse` — склад (name, address, accountId)
- `MaterialRequest` — заявка на материал (materialId, quantity, status, projectId)
- `MaterialAlternative` — альтернативный материал для позиции

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Код материала (`code`) уникален в рамках аккаунта
- Мягкое удаление через поле `deletedAt`
